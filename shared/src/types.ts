export type PowerId = "russia" | "germany" | "uk" | "japan" | "usa";

export type Alliance = "axis" | "allies";

export type UnitId =
  | "infantry"
  | "artillery"
  | "tank"
  | "fighter"
  | "bomber"
  | "battleship"
  | "cruiser"
  | "destroyer"
  | "submarine"
  | "transport"
  | "carrier"
  | "aa"
  | "factory";

export type TerrainType = "land" | "sea";

export type Phase =
  | "purchase"
  | "combatMove"
  | "combat"
  | "nonCombatMove"
  | "place"
  | "collect";

export interface Power {
  id: PowerId;
  name: string;
  alliance: Alliance;
  color: string;
  accent: string;
  capital: string; // territory id
  turnOrder: number;
}

export interface Territory {
  id: string;
  name: string;
  terrain: TerrainType;
  ipc: number; // 0 for sea zones and non-income land
  originalOwner?: PowerId; // homeland / starting owner for income + capital rules
  neighbors: string[];
  x: number; // map coord (SVG units)
  y: number;
}

export interface UnitStack {
  id: string; // unique instance id
  unit: UnitId;
  owner: PowerId;
  territory: string;
  // transient combat-phase state:
  hitsTaken?: number; // for battleships, carriers
  movedFrom?: string; // for combat move / non-combat move tracking
  movesUsed?: number;
}

export interface PurchaseOrder {
  unit: UnitId;
  qty: number;
}

export interface TerritoryState {
  id: string;
  owner: PowerId | null;
}

export interface BattleLogEntry {
  round: number;
  attackerRolls: number[];
  defenderRolls: number[];
  attackerHits: number;
  defenderHits: number;
  attackerCasualties: UnitId[];
  defenderCasualties: UnitId[];
}

export interface Battle {
  territory: string;
  attacker: PowerId;
  defender: PowerId | null;
  attackingUnits: string[]; // unit stack ids
  defendingUnits: string[];
  rounds: BattleLogEntry[];
  resolved: boolean;
  attackerRetreated?: boolean;
  winner?: "attacker" | "defender" | "draw";
}

export interface GameState {
  id: string;
  createdAt: number;
  phase: Phase;
  turn: number; // 1-based round number
  activePower: PowerId;
  powers: Record<PowerId, {
    treasury: number;
    income: number;
    producedThisTurn: PurchaseOrder[]; // bought but not yet placed
    eliminated: boolean;
  }>;
  territories: Record<string, TerritoryState>;
  units: Record<string, UnitStack>;
  battles: Battle[];
  log: string[];
  winner?: Alliance;
}

export interface ClientSession {
  sessionId: string;
  name: string;
  power?: PowerId;
}
