import type { UnitId, TerrainType } from "./types.js";

export interface UnitDef {
  id: UnitId;
  name: string;
  cost: number;
  attack: number;
  defense: number;
  move: number;
  domain: TerrainType | "air";
  hitpoints: number;
  special?: string[];
}

export const UNITS: Record<UnitId, UnitDef> = {
  infantry: {
    id: "infantry", name: "Infantry", cost: 3, attack: 1, defense: 2, move: 1,
    domain: "land", hitpoints: 1, special: ["artillerySupport"],
  },
  artillery: {
    id: "artillery", name: "Artillery", cost: 4, attack: 2, defense: 2, move: 1,
    domain: "land", hitpoints: 1, special: ["supportsInfantry"],
  },
  tank: {
    id: "tank", name: "Tank", cost: 6, attack: 3, defense: 3, move: 2,
    domain: "land", hitpoints: 1, special: ["blitz"],
  },
  fighter: {
    id: "fighter", name: "Fighter", cost: 10, attack: 3, defense: 4, move: 4,
    domain: "air", hitpoints: 1,
  },
  bomber: {
    id: "bomber", name: "Bomber", cost: 12, attack: 4, defense: 1, move: 6,
    domain: "air", hitpoints: 1,
  },
  battleship: {
    id: "battleship", name: "Battleship", cost: 20, attack: 4, defense: 4, move: 2,
    domain: "sea", hitpoints: 2, special: ["shoreBombard"],
  },
  cruiser: {
    id: "cruiser", name: "Cruiser", cost: 12, attack: 3, defense: 3, move: 2,
    domain: "sea", hitpoints: 1, special: ["shoreBombard"],
  },
  destroyer: {
    id: "destroyer", name: "Destroyer", cost: 8, attack: 2, defense: 2, move: 2,
    domain: "sea", hitpoints: 1, special: ["antiSub"],
  },
  submarine: {
    id: "submarine", name: "Submarine", cost: 6, attack: 2, defense: 1, move: 2,
    domain: "sea", hitpoints: 1, special: ["surpriseStrike", "submerge"],
  },
  transport: {
    id: "transport", name: "Transport", cost: 7, attack: 0, defense: 0, move: 2,
    domain: "sea", hitpoints: 1, special: ["carries:2"],
  },
  carrier: {
    id: "carrier", name: "Aircraft Carrier", cost: 14, attack: 1, defense: 2, move: 2,
    domain: "sea", hitpoints: 2, special: ["carriesFighters:2"],
  },
  aa: {
    id: "aa", name: "AA Gun", cost: 5, attack: 0, defense: 0, move: 1,
    domain: "land", hitpoints: 1, special: ["antiAir"],
  },
  factory: {
    id: "factory", name: "Industrial Complex", cost: 15, attack: 0, defense: 0, move: 0,
    domain: "land", hitpoints: 1, special: ["produces"],
  },
};

export const PURCHASABLE: UnitId[] = [
  "infantry", "artillery", "tank", "aa", "factory",
  "fighter", "bomber",
  "submarine", "destroyer", "transport", "cruiser", "carrier", "battleship",
];

export function isLand(u: UnitId): boolean {
  return UNITS[u].domain === "land";
}
export function isSea(u: UnitId): boolean {
  return UNITS[u].domain === "sea";
}
export function isAir(u: UnitId): boolean {
  return UNITS[u].domain === "air";
}
