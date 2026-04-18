import { Battle, GameState, BattleLogEntry, UNITS, POWERS } from "@aa/shared";
import { rollMany } from "./rng.js";

/**
 * Resolve one round of simultaneous combat.
 * - Attacker rolls 1 die per unit at unit.attack.
 * - Defender rolls 1 die per unit at unit.defense.
 * - Infantry gets +1 attack if an artillery pairs (1:1 up to infantry count).
 * - Hits are applied after both sides roll; client may supply explicit casualty picks,
 *   otherwise we pick cheapest first (standard A&A convention).
 */
export function resolveBattleRound(
  state: GameState,
  battle: Battle,
  attackerCasualtyPicks: string[],
): BattleLogEntry {
  const atts = battle.attackingUnits.map((uid) => state.units[uid]).filter(Boolean);
  const defs = battle.defendingUnits.map((uid) => state.units[uid]).filter(Boolean);

  // Attack values: infantry+artillery support
  const infantries = atts.filter((u) => u.unit === "infantry");
  const artilleries = atts.filter((u) => u.unit === "artillery");
  const boostedInf = Math.min(infantries.length, artilleries.length);

  let attBoostRemaining = boostedInf;
  const attRolls: number[] = [];
  for (const u of atts) {
    let val = UNITS[u.unit].attack;
    if (u.unit === "infantry" && attBoostRemaining > 0) {
      val = 2;
      attBoostRemaining -= 1;
    }
    if (val <= 0) continue;
    const die = rollMany(1)[0];
    attRolls.push(die);
    if (die <= val) {
      // hit
    }
  }
  // Recompute hits with same values (re-walk to count)
  let attBoost2 = boostedInf;
  let attHits = 0;
  let cursor = 0;
  for (const u of atts) {
    let val = UNITS[u.unit].attack;
    if (u.unit === "infantry" && attBoost2 > 0) { val = 2; attBoost2 -= 1; }
    if (val <= 0) continue;
    if (attRolls[cursor] <= val) attHits += 1;
    cursor += 1;
  }

  const defRolls: number[] = [];
  for (const u of defs) {
    const val = UNITS[u.unit].defense;
    if (val <= 0) continue;
    defRolls.push(rollMany(1)[0]);
  }
  let defHits = 0;
  let dCursor = 0;
  for (const u of defs) {
    const val = UNITS[u.unit].defense;
    if (val <= 0) continue;
    if (defRolls[dCursor] <= val) defHits += 1;
    dCursor += 1;
  }

  const attCas: string[] = pickCasualties(atts.map((u) => u.id), attackerCasualtyPicks, defHits, state);
  const defCas: string[] = pickCasualties(defs.map((u) => u.id), [], attHits, state);

  const attCasTypes = attCas.map((uid) => state.units[uid]?.unit).filter(Boolean) as any[];
  const defCasTypes = defCas.map((uid) => state.units[uid]?.unit).filter(Boolean) as any[];

  // Apply damage — 2-hp units absorb first (battleship, carrier)
  applyHits(state, attCas);
  applyHits(state, defCas);

  return {
    round: battle.rounds.length + 1,
    attackerRolls: attRolls,
    defenderRolls: defRolls,
    attackerHits: attHits,
    defenderHits: defHits,
    attackerCasualties: attCasTypes,
    defenderCasualties: defCasTypes,
  };
}

function pickCasualties(unitIds: string[], preferred: string[], hits: number, state: GameState): string[] {
  const chosen: string[] = [];
  const remaining = [...unitIds];

  // Client-chosen
  for (const pid of preferred) {
    if (hits <= 0) break;
    const idx = remaining.indexOf(pid);
    if (idx >= 0) {
      chosen.push(pid);
      remaining.splice(idx, 1);
      hits -= 1;
    }
  }
  // Fill with cheapest first
  remaining.sort((a, b) => (UNITS[state.units[a].unit]?.cost ?? 99) - (UNITS[state.units[b].unit]?.cost ?? 99));
  while (hits > 0 && remaining.length > 0) {
    chosen.push(remaining.shift()!);
    hits -= 1;
  }
  return chosen;
}

function applyHits(state: GameState, casualties: string[]): void {
  for (const uid of casualties) {
    const u = state.units[uid];
    if (!u) continue;
    const hp = UNITS[u.unit].hitpoints;
    if (hp > 1 && (u.hitsTaken ?? 0) < hp - 1) {
      u.hitsTaken = (u.hitsTaken ?? 0) + 1;
    } else {
      delete state.units[uid];
    }
  }
}
