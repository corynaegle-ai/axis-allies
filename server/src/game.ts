import {
  GameState, PowerId, Phase, UnitStack, Order, Battle, TerritoryState,
  PurchaseOrder, UnitId, POWERS, POWER_ORDER, TERRITORIES, TERRITORY_MAP,
  STARTING_SETUP, UNITS, isLand, isSea, isAir,
} from "@aa/shared";
import { nanoid } from "nanoid";
import { resolveBattleRound } from "./combat.js";

/** Build a fresh game at turn 1, Russia's purchase phase. */
export function newGame(id: string): GameState {
  const territories: Record<string, TerritoryState> = {};
  for (const t of TERRITORIES) {
    territories[t.id] = { id: t.id, owner: t.originalOwner ?? null };
  }

  const units: Record<string, UnitStack> = {};
  for (const s of STARTING_SETUP) {
    for (const [unit, qty] of Object.entries(s.units) as [UnitId, number][]) {
      for (let i = 0; i < qty; i++) {
        const uid = nanoid(8);
        units[uid] = { id: uid, unit, owner: s.owner, territory: s.territory };
      }
    }
  }

  const powers = Object.fromEntries(
    POWER_ORDER.map((p) => [p, {
      treasury: startingTreasury(p),
      income: 0,
      producedThisTurn: [] as PurchaseOrder[],
      eliminated: false,
    }])
  ) as unknown as GameState["powers"];

  const state: GameState = {
    id,
    createdAt: Date.now(),
    phase: "purchase",
    turn: 1,
    activePower: "russia",
    powers,
    territories,
    units,
    pendingOrders: [],
    battles: [],
    log: [`Game started. Russia's turn.`],
  };
  state.powers.russia.income = computeIncome(state, "russia");
  return state;
}

function startingTreasury(p: PowerId): number {
  // Initial purchase budget equals starting income.
  const sums: Record<PowerId, number> = { russia: 24, germany: 32, uk: 30, japan: 26, usa: 40 };
  return sums[p];
}

export function computeIncome(state: GameState, power: PowerId): number {
  let ipc = 0;
  for (const t of TERRITORIES) {
    if (t.terrain !== "land") continue;
    if (state.territories[t.id].owner === power) ipc += t.ipc;
  }
  return ipc;
}

/** Validate and apply a purchase order list; totals must fit treasury. */
export function applyPurchase(state: GameState, power: PowerId, orders: PurchaseOrder[]): string | null {
  if (state.activePower !== power) return "Not your turn.";
  if (state.phase !== "purchase") return "Not purchase phase.";
  const cost = orders.reduce((s, o) => s + UNITS[o.unit].cost * o.qty, 0);
  if (cost > state.powers[power].treasury) return "Not enough IPCs.";
  state.powers[power].treasury -= cost;
  state.powers[power].producedThisTurn.push(...orders);
  state.log.push(`${POWERS[power].name} purchased: ${orders.map(o => `${o.qty}×${o.unit}`).join(", ") || "(nothing)"}`);
  return null;
}

/** Record a movement order. Does not execute — creates pending battles if combat. */
export function applyMove(
  state: GameState, power: PowerId, unitIds: string[], path: string[], kind: "combat" | "nonCombat"
): string | null {
  if (state.activePower !== power) return "Not your turn.";
  if (kind === "combat" && state.phase !== "combatMove") return "Not combat move phase.";
  if (kind === "nonCombat" && state.phase !== "nonCombatMove") return "Not non-combat phase.";
  if (path.length < 2) return "Path too short.";

  const origin = path[0];
  const dest = path[path.length - 1];
  const destTerr = TERRITORY_MAP[dest];
  if (!destTerr) return "Unknown destination.";

  // Validate each unit can take this path.
  for (const uid of unitIds) {
    const u = state.units[uid];
    if (!u) return `Unknown unit ${uid}.`;
    if (u.owner !== power) return "Cannot move enemy units.";
    if (u.territory !== origin) return "Unit not at origin.";
    const def = UNITS[u.unit];
    const steps = path.length - 1;
    if (steps > def.move) return `${def.name} can't move ${steps} spaces.`;
    // Domain check on destination (sea unit must land in sea, etc.)
    if (isLand(u.unit) && destTerr.terrain !== "land") return `${def.name} can't enter sea.`;
    if (isSea(u.unit) && destTerr.terrain !== "sea") return `${def.name} can't enter land.`;
    // Path adjacency
    for (let i = 0; i < path.length - 1; i++) {
      if (!TERRITORY_MAP[path[i]].neighbors.includes(path[i + 1])) return "Illegal path.";
    }
  }

  // Combat move: flag battle at destination if enemies present.
  if (kind === "combat") {
    const defenders = Object.values(state.units).filter((u) =>
      u.territory === dest && POWERS[u.owner].alliance !== POWERS[power].alliance
    );
    const territoryOwner = state.territories[dest].owner;
    const enemyTerritory = territoryOwner != null && POWERS[territoryOwner].alliance !== POWERS[power].alliance;
    if (defenders.length === 0 && !enemyTerritory) {
      return "No enemies at destination — use non-combat move.";
    }
  } else {
    // Non-combat: can't move into enemy-occupied territory.
    const defenders = Object.values(state.units).filter((u) =>
      u.territory === dest && POWERS[u.owner].alliance !== POWERS[power].alliance
    );
    if (defenders.length > 0) return "Cannot non-combat into enemy units.";
    const territoryOwner = state.territories[dest].owner;
    if (destTerr.terrain === "land" && territoryOwner != null && POWERS[territoryOwner].alliance !== POWERS[power].alliance) {
      return "Cannot non-combat into enemy territory.";
    }
  }

  // Move units (we snap to destination; mid-path stops are not tracked).
  for (const uid of unitIds) {
    const u = state.units[uid];
    u.movedFrom = u.territory;
    u.territory = dest;
    u.movesUsed = (u.movesUsed ?? 0) + (path.length - 1);
  }

  state.pendingOrders.push({
    id: nanoid(8), owner: power, unitIds, path, kind,
  });

  // Create or merge battle if combat move with opposition
  if (kind === "combat") {
    let battle = state.battles.find((b) => b.territory === dest && !b.resolved);
    if (!battle) {
      const defenders = Object.values(state.units).filter((u) =>
        u.territory === dest && POWERS[u.owner].alliance !== POWERS[power].alliance
      );
      const defenderOwner = defenders[0]?.owner ?? state.territories[dest].owner ?? null;
      battle = {
        territory: dest,
        attacker: power,
        defender: defenderOwner,
        attackingUnits: [],
        defendingUnits: defenders.map((d) => d.id),
        rounds: [],
        resolved: false,
      };
      state.battles.push(battle);
    }
    battle.attackingUnits.push(...unitIds);
  }

  state.log.push(`${POWERS[power].name} moved ${unitIds.length} unit(s): ${origin} → ${dest}`);
  return null;
}

/** Roll one round of a given battle. Returns error or null. */
export function applyResolveBattle(
  state: GameState, power: PowerId, territory: string,
  opts: { retreat?: boolean; retreatTo?: string; casualties?: string[] } = {},
): string | null {
  if (state.activePower !== power) return "Not your turn.";
  if (state.phase !== "combat") return "Not combat phase.";
  const battle = state.battles.find((b) => b.territory === territory && !b.resolved);
  if (!battle) return "No open battle here.";
  if (battle.attacker !== power) return "You are not the attacker.";

  if (opts.retreat) {
    const retreatTo = opts.retreatTo;
    if (!retreatTo || !battle.attackingUnits.every((uid) => {
      const u = state.units[uid];
      return u && u.movedFrom && TERRITORY_MAP[u.movedFrom] && [u.movedFrom, battle.territory].includes(retreatTo) || TERRITORY_MAP[u.movedFrom!]?.neighbors.includes(retreatTo);
    })) {
      // Simplified: attacker may retreat to the origin territory of first unit if all came from same place.
      const firstOrigin = state.units[battle.attackingUnits[0]]?.movedFrom;
      if (!firstOrigin || retreatTo !== firstOrigin) return "Invalid retreat destination.";
    }
    for (const uid of battle.attackingUnits) {
      const u = state.units[uid];
      if (u) u.territory = retreatTo!;
    }
    battle.attackerRetreated = true;
    battle.resolved = true;
    battle.winner = "defender";
    state.log.push(`${POWERS[power].name} retreated from ${territory}.`);
    return null;
  }

  const round = resolveBattleRound(state, battle, opts.casualties ?? []);
  battle.rounds.push(round);
  state.log.push(
    `Battle at ${territory} R${battle.rounds.length}: att ${round.attackerHits}H / def ${round.defenderHits}H`
  );

  // Purge destroyed units
  const attAlive = battle.attackingUnits.filter((uid) => state.units[uid]);
  const defAlive = battle.defendingUnits.filter((uid) => state.units[uid]);
  battle.attackingUnits = attAlive;
  battle.defendingUnits = defAlive;

  // Victory check
  if (defAlive.length === 0 && attAlive.length > 0) {
    battle.resolved = true;
    battle.winner = "attacker";
    // Capture territory
    const t = TERRITORY_MAP[territory];
    if (t.terrain === "land") {
      state.territories[territory].owner = power;
      // Capital capture: steal treasury
      for (const p of POWER_ORDER) {
        if (POWERS[p].capital === territory && p !== power) {
          const looted = state.powers[p].treasury;
          state.powers[power].treasury += looted;
          state.powers[p].treasury = 0;
          state.log.push(`${POWERS[power].name} captured ${POWERS[p].name}'s capital — looted ${looted} IPC!`);
        }
      }
    }
    state.log.push(`${POWERS[power].name} captured ${territory}.`);
  } else if (attAlive.length === 0) {
    battle.resolved = true;
    battle.winner = defAlive.length === 0 ? "draw" : "defender";
    state.log.push(`Attacker eliminated at ${territory}.`);
  }

  checkVictory(state);
  return null;
}

/** Mobilize a single purchased unit to a territory with a friendly factory (or valid sea zone). */
export function applyPlace(state: GameState, power: PowerId, unit: UnitId, territory: string): string | null {
  if (state.activePower !== power) return "Not your turn.";
  if (state.phase !== "place") return "Not place phase.";
  const pool = state.powers[power].producedThisTurn;
  const idx = pool.findIndex((o) => o.unit === unit && o.qty > 0);
  if (idx < 0) return "Unit not in production pool.";

  const t = TERRITORY_MAP[territory];
  if (!t) return "Unknown territory.";
  const def = UNITS[unit];

  if (def.domain === "land" || def.domain === "air") {
    if (t.terrain !== "land") return "Land/air units placed on land.";
    if (state.territories[territory].owner !== power) return "Must place in your own territory.";
    const hasFactory = Object.values(state.units).some((u) =>
      u.territory === territory && u.unit === "factory" && u.owner === power
    );
    if (!hasFactory && unit !== "factory") return "No factory here.";
  } else if (def.domain === "sea") {
    if (t.terrain !== "sea") return "Sea units placed in sea zones.";
    // Must be adjacent to a friendly land territory with a factory.
    const adjFactory = t.neighbors.some((nid) => {
      const nt = TERRITORY_MAP[nid];
      if (!nt || nt.terrain !== "land") return false;
      if (state.territories[nid].owner !== power) return false;
      return Object.values(state.units).some((u) =>
        u.territory === nid && u.unit === "factory" && u.owner === power
      );
    });
    if (!adjFactory) return "No adjacent factory to mobilize sea units.";
  }

  const uid = nanoid(8);
  state.units[uid] = { id: uid, unit, owner: power, territory };
  pool[idx].qty -= 1;
  if (pool[idx].qty === 0) pool.splice(idx, 1);
  state.log.push(`${POWERS[power].name} placed ${unit} at ${territory}.`);
  return null;
}

/** Advance to next phase (and next power when a turn ends). */
export function advancePhase(state: GameState): void {
  const seq: Phase[] = ["purchase", "combatMove", "combat", "nonCombatMove", "place", "collect"];
  const i = seq.indexOf(state.phase);
  const current = state.activePower;

  if (state.phase === "combat") {
    // Auto-resolve any remaining unresolved (no-defender) battles as captures
    for (const b of state.battles) {
      if (b.resolved || b.attacker !== current) continue;
      if (b.defendingUnits.length === 0) {
        b.resolved = true;
        b.winner = "attacker";
        const t = TERRITORY_MAP[b.territory];
        if (t.terrain === "land") state.territories[b.territory].owner = current;
        state.log.push(`${POWERS[current].name} walked into ${b.territory}.`);
      }
    }
  }

  if (state.phase === "collect") {
    // Grant income, clear transient flags, advance to next power.
    const income = computeIncome(state, current);
    state.powers[current].treasury += income;
    state.powers[current].income = income;
    state.log.push(`${POWERS[current].name} collected ${income} IPC. Treasury: ${state.powers[current].treasury}.`);

    // Clear transient per-turn unit flags
    for (const u of Object.values(state.units)) {
      u.movedFrom = undefined;
      u.movesUsed = 0;
      u.hitsTaken = 0;
    }
    // Clear resolved battles
    state.battles = [];
    state.pendingOrders = [];

    // Next active power
    const idx = POWER_ORDER.indexOf(current);
    let next = POWER_ORDER[(idx + 1) % POWER_ORDER.length];
    // Skip eliminated powers
    let guard = 0;
    while (state.powers[next].eliminated && guard++ < POWER_ORDER.length) {
      next = POWER_ORDER[(POWER_ORDER.indexOf(next) + 1) % POWER_ORDER.length];
    }
    if (idx === POWER_ORDER.length - 1) state.turn += 1;
    state.activePower = next;
    state.phase = "purchase";
    state.powers[next].income = computeIncome(state, next);
    state.log.push(`Turn ${state.turn}: ${POWERS[next].name}'s turn.`);
    return;
  }

  state.phase = seq[i + 1];
  state.log.push(`${POWERS[current].name} → ${state.phase}`);
}

/** Axis wins by holding all 3 Allied capitals simultaneously; Allies by holding both Axis capitals. */
export function checkVictory(state: GameState): void {
  const holds = (alliance: "axis" | "allies", capitals: string[]): boolean =>
    capitals.every((cap) => {
      const owner = state.territories[cap].owner;
      return owner != null && POWERS[owner].alliance === alliance;
    });
  const axisCaps = ["germany_terr", "japan"];
  const alliedCaps = ["russia", "united_kingdom", "eastern_usa"];
  if (holds("axis", alliedCaps)) state.winner = "axis";
  else if (holds("allies", axisCaps)) state.winner = "allies";
}
