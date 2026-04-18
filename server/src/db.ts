import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { GameState, PowerId, ClientSession } from "@aa/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH ?? path.resolve(__dirname, "../../axis-allies.db");

let _db: Database.Database;

export function openDb(): void {
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  createSchema();
  console.log(`[db] SQLite opened at ${DB_PATH}`);
}

function db(): Database.Database {
  if (!_db) throw new Error("openDb() must be called before using the database");
  return _db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

function createSchema(): void {
  db().exec(`
    CREATE TABLE IF NOT EXISTS games (
      id           TEXT    PRIMARY KEY,
      name         TEXT    NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'lobby'
                   CHECK(status IN ('lobby','active','finished','abandoned')),
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL,
      phase        TEXT,
      turn         INTEGER DEFAULT 1,
      active_power TEXT,
      winner       TEXT    CHECK(winner IN ('axis','allies') OR winner IS NULL)
    );

    CREATE TABLE IF NOT EXISTS players (
      session_id   TEXT    PRIMARY KEY,
      name         TEXT    NOT NULL,
      created_at   INTEGER NOT NULL,
      last_seen    INTEGER NOT NULL
    );

    -- One row per (game, player). power is the faction they control.
    -- status: 'active' while playing, 'quit' if they forfeited, 'disconnected' if they dropped.
    CREATE TABLE IF NOT EXISTS game_players (
      game_id      TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      session_id   TEXT    NOT NULL REFERENCES players(session_id),
      power        TEXT    NOT NULL
                   CHECK(power IN ('russia','germany','uk','japan','usa')),
      status       TEXT    NOT NULL DEFAULT 'active'
                   CHECK(status IN ('active','quit','disconnected')),
      joined_at    INTEGER NOT NULL,
      quit_at      INTEGER,
      PRIMARY KEY (game_id, session_id),
      UNIQUE (game_id, power)
    );

    -- Per-power financial state. Updated on every save.
    CREATE TABLE IF NOT EXISTS power_states (
      game_id      TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      power        TEXT    NOT NULL
                   CHECK(power IN ('russia','germany','uk','japan','usa')),
      treasury     INTEGER NOT NULL DEFAULT 0,
      income       INTEGER NOT NULL DEFAULT 0,
      eliminated   INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (game_id, power)
    );

    -- Current ownership of every territory for a game.
    CREATE TABLE IF NOT EXISTS territory_states (
      game_id      TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      territory_id TEXT    NOT NULL,
      owner        TEXT,
      PRIMARY KEY (game_id, territory_id)
    );

    -- Every unit instance. Soft-deleted (alive=0) when destroyed so
    -- battle_units foreign keys remain valid.
    CREATE TABLE IF NOT EXISTS units (
      id           TEXT    PRIMARY KEY,
      game_id      TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      unit_type    TEXT    NOT NULL,
      owner        TEXT    NOT NULL,
      territory    TEXT    NOT NULL,
      hits_taken   INTEGER NOT NULL DEFAULT 0,
      moved_from   TEXT,
      moves_used   INTEGER,
      alive        INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_units_game      ON units(game_id);
    CREATE INDEX IF NOT EXISTS idx_units_territory ON units(game_id, territory);
    CREATE INDEX IF NOT EXISTS idx_units_owner     ON units(game_id, owner);

    -- Units purchased but not yet placed on the map (cleared each collect phase).
    CREATE TABLE IF NOT EXISTS pending_purchases (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id      TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      power        TEXT    NOT NULL,
      unit_type    TEXT    NOT NULL,
      qty          INTEGER NOT NULL CHECK(qty > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_pending_game_power ON pending_purchases(game_id, power);

    -- One row per battle. Resolved battles are kept for history.
    CREATE TABLE IF NOT EXISTS battles (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id            TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      territory          TEXT    NOT NULL,
      attacker           TEXT    NOT NULL,
      defender           TEXT,
      resolved           INTEGER NOT NULL DEFAULT 0,
      attacker_retreated INTEGER NOT NULL DEFAULT 0,
      winner             TEXT    CHECK(winner IN ('attacker','defender','draw') OR winner IS NULL),
      created_turn       INTEGER NOT NULL,
      created_phase      TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_battles_game   ON battles(game_id);
    CREATE INDEX IF NOT EXISTS idx_battles_active ON battles(game_id, resolved);

    -- Unit IDs participating in a battle, with their side.
    CREATE TABLE IF NOT EXISTS battle_units (
      battle_id    INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
      unit_id      TEXT    NOT NULL,
      side         TEXT    NOT NULL CHECK(side IN ('attacker','defender')),
      PRIMARY KEY (battle_id, unit_id)
    );

    -- Immutable per-round combat log. Append-only.
    CREATE TABLE IF NOT EXISTS battle_rounds (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      battle_id           INTEGER NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
      round               INTEGER NOT NULL,
      attacker_rolls      TEXT    NOT NULL,
      defender_rolls      TEXT    NOT NULL,
      attacker_hits       INTEGER NOT NULL,
      defender_hits       INTEGER NOT NULL,
      attacker_casualties TEXT    NOT NULL,
      defender_casualties TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_rounds_battle ON battle_rounds(battle_id);

    -- Action log mirror (most recent 200 entries from GameState.log).
    -- Cleared and reinserted on each save; full history lives in saves.snapshot.
    CREATE TABLE IF NOT EXISTS game_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id      TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      turn         INTEGER NOT NULL,
      phase        TEXT    NOT NULL,
      entry        TEXT    NOT NULL,
      created_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_log_game ON game_log(game_id, id);

    -- Snapshot checkpoints. 'auto' saves are kept (last 5 per game).
    -- 'manual' saves are kept indefinitely.
    -- snapshot column holds the full GameState JSON — used for fast restore on reconnect.
    CREATE TABLE IF NOT EXISTS saves (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id      TEXT    NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      label        TEXT    NOT NULL DEFAULT 'auto',
      created_at   INTEGER NOT NULL,
      turn         INTEGER NOT NULL,
      phase        TEXT    NOT NULL,
      active_power TEXT    NOT NULL,
      snapshot     TEXT    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_saves_game ON saves(game_id, created_at);
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// Player persistence
// ─────────────────────────────────────────────────────────────────────────────

export function upsertPlayer(session: ClientSession): void {
  const now = Date.now();
  db().prepare(`
    INSERT INTO players (session_id, name, created_at, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET name = excluded.name, last_seen = excluded.last_seen
  `).run(session.sessionId, session.name, now, now);
}

// ─────────────────────────────────────────────────────────────────────────────
// Game lifecycle
// ─────────────────────────────────────────────────────────────────────────────

export function createGameRecord(gameId: string, name: string): void {
  const now = Date.now();
  db().prepare(`
    INSERT OR IGNORE INTO games (id, name, status, created_at, updated_at)
    VALUES (?, ?, 'lobby', ?, ?)
  `).run(gameId, name, now, now);
}

export function addGamePlayer(gameId: string, sessionId: string, power: PowerId): void {
  db().prepare(`
    INSERT OR REPLACE INTO game_players (game_id, session_id, power, status, joined_at)
    VALUES (?, ?, ?, 'active', ?)
  `).run(gameId, sessionId, power, Date.now());
}

export function markPlayerQuit(gameId: string, sessionId: string): void {
  db().prepare(`
    UPDATE game_players SET status = 'quit', quit_at = ? WHERE game_id = ? AND session_id = ?
  `).run(Date.now(), gameId, sessionId);
}

export function countActivePlayers(gameId: string): number {
  const row = db().prepare(
    `SELECT COUNT(*) as cnt FROM game_players WHERE game_id = ? AND status = 'active'`
  ).get(gameId) as { cnt: number };
  return row.cnt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full game-state save (called after every mutating WS message)
// ─────────────────────────────────────────────────────────────────────────────

export function saveGame(gameId: string, gameName: string, state: GameState): void {
  const now = Date.now();

  const txn = db().transaction(() => {
    // 1. Game header
    db().prepare(`
      INSERT INTO games (id, name, status, created_at, updated_at, phase, turn, active_power, winner)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status       = CASE WHEN excluded.winner IS NOT NULL THEN 'finished' ELSE 'active' END,
        updated_at   = excluded.updated_at,
        phase        = excluded.phase,
        turn         = excluded.turn,
        active_power = excluded.active_power,
        winner       = excluded.winner
    `).run(
      gameId, gameName,
      state.winner ? "finished" : "active",
      state.createdAt, now,
      state.phase, state.turn, state.activePower,
      state.winner ?? null,
    );

    // 2. Power states (upsert all 5)
    const upsertPower = db().prepare(`
      INSERT INTO power_states (game_id, power, treasury, income, eliminated)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(game_id, power) DO UPDATE SET
        treasury   = excluded.treasury,
        income     = excluded.income,
        eliminated = excluded.eliminated
    `);
    for (const [p, ps] of Object.entries(state.powers)) {
      upsertPower.run(gameId, p, ps.treasury, ps.income, ps.eliminated ? 1 : 0);
    }

    // 3. Territory states (upsert all 78)
    const upsertTerr = db().prepare(`
      INSERT INTO territory_states (game_id, territory_id, owner)
      VALUES (?, ?, ?)
      ON CONFLICT(game_id, territory_id) DO UPDATE SET owner = excluded.owner
    `);
    for (const [tid, ts] of Object.entries(state.territories)) {
      upsertTerr.run(gameId, tid, ts.owner ?? null);
    }

    // 4. Units — upsert alive, soft-delete those removed from state
    const knownIds = new Set<string>(
      (db().prepare(`SELECT id FROM units WHERE game_id = ?`).all(gameId) as { id: string }[])
        .map((r) => r.id),
    );
    const upsertUnit = db().prepare(`
      INSERT INTO units (id, game_id, unit_type, owner, territory, hits_taken, moved_from, moves_used, alive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        unit_type  = excluded.unit_type,
        owner      = excluded.owner,
        territory  = excluded.territory,
        hits_taken = excluded.hits_taken,
        moved_from = excluded.moved_from,
        moves_used = excluded.moves_used,
        alive      = 1
    `);
    const markDead = db().prepare(`UPDATE units SET alive = 0 WHERE id = ?`);
    const currentIds = new Set<string>();
    for (const [uid, u] of Object.entries(state.units)) {
      upsertUnit.run(
        uid, gameId, u.unit, u.owner, u.territory,
        u.hitsTaken ?? 0, u.movedFrom ?? null, u.movesUsed ?? null,
      );
      currentIds.add(uid);
    }
    for (const id of knownIds) {
      if (!currentIds.has(id)) markDead.run(id);
    }

    // 5. Pending purchases (delete + reinsert)
    db().prepare(`DELETE FROM pending_purchases WHERE game_id = ?`).run(gameId);
    const insertPurchase = db().prepare(
      `INSERT INTO pending_purchases (game_id, power, unit_type, qty) VALUES (?, ?, ?, ?)`,
    );
    for (const [p, ps] of Object.entries(state.powers)) {
      for (const order of ps.producedThisTurn) {
        insertPurchase.run(gameId, p, order.unit, order.qty);
      }
    }

    // 6. Battles — delete all and reinsert from current state.
    // Battles are cleared from state at collect phase, so DB history is bounded.
    // battle_rounds/battle_units are cascade-deleted, then reinserted.
    db().prepare(`DELETE FROM battles WHERE game_id = ?`).run(gameId);
    const insertBattle = db().prepare(`
      INSERT INTO battles
        (game_id, territory, attacker, defender, resolved, attacker_retreated, winner, created_turn, created_phase)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertBattleUnit = db().prepare(
      `INSERT OR IGNORE INTO battle_units (battle_id, unit_id, side) VALUES (?, ?, ?)`,
    );
    const insertBattleRound = db().prepare(`
      INSERT INTO battle_rounds
        (battle_id, round, attacker_rolls, defender_rolls, attacker_hits, defender_hits, attacker_casualties, defender_casualties)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const battle of state.battles) {
      const { lastInsertRowid } = insertBattle.run(
        gameId, battle.territory, battle.attacker, battle.defender ?? null,
        battle.resolved ? 1 : 0, battle.attackerRetreated ? 1 : 0,
        battle.winner ?? null, state.turn, state.phase,
      );
      const battleDbId = lastInsertRowid as number;
      for (const uid of battle.attackingUnits) insertBattleUnit.run(battleDbId, uid, "attacker");
      for (const uid of battle.defendingUnits) insertBattleUnit.run(battleDbId, uid, "defender");
      for (const r of battle.rounds) {
        insertBattleRound.run(
          battleDbId, r.round,
          JSON.stringify(r.attackerRolls), JSON.stringify(r.defenderRolls),
          r.attackerHits, r.defenderHits,
          JSON.stringify(r.attackerCasualties), JSON.stringify(r.defenderCasualties),
        );
      }
    }

    // 7. Game log — mirror the most-recent window from GameState.log.
    // Full point-in-time history lives in saves.snapshot.
    db().prepare(`DELETE FROM game_log WHERE game_id = ?`).run(gameId);
    const insertLog = db().prepare(
      `INSERT INTO game_log (game_id, turn, phase, entry, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const entry of state.log) {
      insertLog.run(gameId, state.turn, state.phase, entry, now);
    }

    // 8. Auto-save snapshot (full JSON for fast restore)
    db().prepare(`
      INSERT INTO saves (game_id, label, created_at, turn, phase, active_power, snapshot)
      VALUES (?, 'auto', ?, ?, ?, ?, ?)
    `).run(gameId, now, state.turn, state.phase, state.activePower, JSON.stringify(state));

    // Prune: keep only the 5 most recent auto-saves per game
    db().prepare(`
      DELETE FROM saves
      WHERE game_id = ? AND label = 'auto'
        AND id NOT IN (
          SELECT id FROM saves WHERE game_id = ? AND label = 'auto'
          ORDER BY created_at DESC LIMIT 5
        )
    `).run(gameId, gameId);
  });

  txn();
}

// ─────────────────────────────────────────────────────────────────────────────
// Manual save point
// ─────────────────────────────────────────────────────────────────────────────

export function createManualSave(gameId: string, label: string, state: GameState): number {
  const result = db().prepare(`
    INSERT INTO saves (game_id, label, created_at, turn, phase, active_power, snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(gameId, label || "Manual save", Date.now(), state.turn, state.phase, state.activePower, JSON.stringify(state));
  return result.lastInsertRowid as number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Load on server restart
// ─────────────────────────────────────────────────────────────────────────────

export interface SavedRoom {
  gameId: string;
  gameName: string;
  state: GameState;
  players: Array<{ sessionId: string; name: string; power: PowerId; status: string }>;
}

export function loadActiveGames(): SavedRoom[] {
  // Only restore games that were in progress (not yet finished/abandoned).
  const rows = db().prepare(`
    SELECT g.id, g.name, s.snapshot
    FROM games g
    JOIN saves s ON s.game_id = g.id
    WHERE g.status = 'active'
      AND s.id = (
        SELECT id FROM saves WHERE game_id = g.id ORDER BY created_at DESC LIMIT 1
      )
  `).all() as Array<{ id: string; name: string; snapshot: string }>;

  const getPlayers = db().prepare(`
    SELECT gp.session_id, p.name, gp.power, gp.status
    FROM game_players gp
    JOIN players p ON p.session_id = gp.session_id
    WHERE gp.game_id = ?
  `);

  return rows.map((row) => {
    const state = JSON.parse(row.snapshot) as GameState;
    const players = (getPlayers.all(row.id) as Array<{
      session_id: string; name: string; power: PowerId; status: string;
    }>).map((p) => ({
      sessionId: p.session_id,
      name: p.name,
      power: p.power,
      status: p.status,
    }));
    return { gameId: row.id, gameName: row.name, state, players };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Query helpers (for reporting / debugging)
// ─────────────────────────────────────────────────────────────────────────────

export interface GameSummary {
  id: string;
  name: string;
  status: string;
  turn: number;
  activePower: string | null;
  winner: string | null;
  updatedAt: number;
  playerCount: number;
}

export function listGames(): GameSummary[] {
  return db().prepare(`
    SELECT
      g.id, g.name, g.status, g.turn,
      g.active_power  AS activePower,
      g.winner,
      g.updated_at    AS updatedAt,
      COUNT(gp.session_id) AS playerCount
    FROM games g
    LEFT JOIN game_players gp ON gp.game_id = g.id AND gp.status = 'active'
    GROUP BY g.id
    ORDER BY g.updated_at DESC
  `).all() as GameSummary[];
}

export interface BattleHistory {
  territory: string;
  attacker: string;
  defender: string | null;
  winner: string | null;
  rounds: number;
  turn: number;
}

export function getBattleHistory(gameId: string): BattleHistory[] {
  return db().prepare(`
    SELECT
      b.territory, b.attacker, b.defender, b.winner,
      b.created_turn AS turn,
      COUNT(br.id)   AS rounds
    FROM battles b
    LEFT JOIN battle_rounds br ON br.battle_id = b.id
    WHERE b.game_id = ? AND b.resolved = 1
    GROUP BY b.id
    ORDER BY b.id
  `).all(gameId) as BattleHistory[];
}

export interface UnitCount {
  power: string;
  unitType: string;
  territory: string;
  count: number;
}

export function getUnitCounts(gameId: string): UnitCount[] {
  return db().prepare(`
    SELECT owner AS power, unit_type AS unitType, territory, COUNT(*) AS count
    FROM units
    WHERE game_id = ? AND alive = 1
    GROUP BY owner, unit_type, territory
    ORDER BY owner, unit_type, territory
  `).all(gameId) as UnitCount[];
}

export interface IpcHistory {
  power: string;
  treasury: number;
  income: number;
  eliminated: number;
}

export function getIpcSnapshot(gameId: string): IpcHistory[] {
  return db().prepare(`
    SELECT power, treasury, income, eliminated
    FROM power_states
    WHERE game_id = ?
    ORDER BY power
  `).all(gameId) as IpcHistory[];
}

export function getGameLog(gameId: string, limit = 100): Array<{ id: number; turn: number; phase: string; entry: string }> {
  return db().prepare(`
    SELECT id, turn, phase, entry FROM game_log
    WHERE game_id = ? ORDER BY id DESC LIMIT ?
  `).all(gameId, limit) as Array<{ id: number; turn: number; phase: string; entry: string }>;
}
