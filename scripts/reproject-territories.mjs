// Reproject every territory in shared/src/map.ts to its real-world geographic
// position using the same Natural Earth projection as client/src/geography.tsx.
//
// Run from repo root:  node scripts/reproject-territories.mjs
//
// - Imports the projection stack from the workspace-level node_modules.
// - Computes projected (x, y) inside the 2400x1200 world canvas for every
//   territory id listed below.
// - Rewrites shared/src/map.ts in place by replacing only the x and y fields
//   on each territory entry — all other fields (id, name, terrain, ipc,
//   originalOwner, neighbors) are preserved.
//
// Adjust LAT_LNG below to tune real-world positions. Values are [lng, lat].

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const worldData = require("world-atlas/land-110m.json");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const MAP_PATH = path.join(REPO_ROOT, "shared", "src", "map.ts");

const WORLD_W = 2400;
const WORLD_H = 1200;

// Real-world centers for every territory id in map.ts.
// Format: [longitude, latitude].
const LAT_LNG = {
  // --- NORTH AMERICA ---
  alaska: [-150, 64],
  greenland: [-40, 72],
  western_canada: [-115, 55],
  eastern_canada: [-80, 50],
  western_usa: [-115, 40],
  central_usa: [-95, 40],
  eastern_usa: [-80, 38],
  mexico: [-102, 23],
  panama: [-80, 9],
  hawaii: [-157, 21],

  // --- SOUTH AMERICA ---
  brazil: [-55, -10],
  argentina: [-65, -35],

  // --- WESTERN / NORTHERN EUROPE ---
  united_kingdom: [-2, 54],
  scandinavia: [15, 62],
  finland: [26, 64],
  northern_europe: [9, 52],
  france: [2, 46],
  germany_terr: [10, 51],
  poland: [20, 52],
  southern_europe: [12, 42],
  eastern_europe: [25, 48],
  balkans: [21, 43],

  // --- USSR ---
  karelia: [32, 63],
  archangel: [41, 64],
  ukraine: [31, 49],
  russia: [37.6, 55.75],
  caucasus: [45, 42],
  ural: [60, 58],
  evenki: [95, 66],
  novosibirsk: [83, 55],
  yakut: [130, 66],
  buryatia: [108, 52],
  soviet_far_east: [135, 55],

  // --- CENTRAL / EAST ASIA ---
  sinkiang: [85, 42],
  mongolia: [104, 46],

  // --- AFRICA ---
  egypt: [30, 22],
  libya: [18, 27],
  algeria: [3, 30],
  french_west_africa: [-5, 17],
  west_africa: [0, 8],
  belgian_congo: [23, -3],
  east_africa: [38, 5],
  south_africa: [24, -30],
  madagascar: [47, -20],

  // --- MIDDLE EAST ---
  middle_east: [37, 32],
  persia: [53, 32],
  afghanistan: [66, 34],

  // --- SOUTH / SE ASIA ---
  india: [78, 22],
  burma: [96, 21],
  siam: [101, 15],
  malaya: [102, 4],
  china: [105, 35],
  manchuria: [125, 45],
  korea: [128, 37],
  japan: [138, 36],
  iwo_jima: [141, 24.75],
  okinawa: [128, 26.5],
  french_indochina: [106, 16],
  philippines: [122, 13],
  east_indies: [110, -2],
  borneo: [114, 1],

  // --- OCEANIA ---
  new_guinea: [141, -6],
  solomon_is: [160, -9],
  caroline_is: [150, 7],
  marshall_is: [171, 7],
  australia: [134, -25],
  new_zealand: [174, -41],

  // --- SEA ZONES ---
  sz_arctic: [0, 82],
  sz_norwegian: [3, 68],
  sz_n_pacific: [180, 45],
  sz_e_pacific: [-130, 25],
  sz_hawaii: [-160, 18],
  sz_w_pacific: [150, 20],
  sz_sea_japan: [135, 40],
  sz_iwo_jima: [142, 27],
  sz_philippine: [132, 15],
  sz_s_china: [115, 15],
  sz_bengal: [88, 12],
  sz_coral: [155, -15],
  sz_solomon: [162, -5],
  sz_tasman: [160, -40],
  sz_s_pacific: [-140, -25],
  sz_indian: [75, -15],
  sz_arabian: [62, 15],
  sz_red: [38, 20],
  sz_med: [18, 36],
  sz_black_sea: [35, 43],
  sz_baltic: [19, 58],
  sz_n_sea: [4, 56],
  sz_n_atlantic: [-35, 48],
  sz_w_atlantic: [-55, 30],
  sz_caribbean: [-75, 15],
  sz_s_atlantic: [-20, -25],
};

// Build the projection exactly as geography.tsx does.
const topo = worldData;
const landFeature = feature(topo, topo.objects.land);
const projection = geoNaturalEarth1().fitExtent(
  [
    [0, 0],
    [WORLD_W, WORLD_H],
  ],
  landFeature,
);

// Compute projected coords for every id.
const projected = {};
const outOfExtent = [];
for (const [id, lnglat] of Object.entries(LAT_LNG)) {
  const p = projection(lnglat);
  if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
    console.warn(`WARN: projection failed for ${id}`);
    continue;
  }
  const x = Math.round(p[0]);
  const y = Math.round(p[1]);
  projected[id] = { x, y };
  if (x < 0 || x > WORLD_W || y < 0 || y > WORLD_H) {
    outOfExtent.push({ id, x, y });
  }
}

// Load map.ts and patch x/y for each territory entry. The file uses the
// pattern:  { id: "xxx", name: ..., ... , x: NNN, y: NNN, neighbors: [...] }
// across multiple lines. We locate each `id: "<id>"` occurrence and then
// replace the nearest following `x: <num>, y: <num>` pair.
const src = await readFile(MAP_PATH, "utf8");

let patched = src;
const missing = [];
let patchedCount = 0;
for (const id of Object.keys(LAT_LNG)) {
  const coords = projected[id];
  if (!coords) continue;
  // Match the entry: starts with { id: "<id>", ... , x: <n>, y: <n>, neighbors
  // Non-greedy match inside an object literal (no newline before the closing
  // "neighbors") — all territory entries fit on one or two lines and have
  // x,y immediately before neighbors.
  const pattern = new RegExp(
    `(\\{\\s*id:\\s*"${id}"[^}]*?)x:\\s*-?\\d+(?:\\.\\d+)?,\\s*y:\\s*-?\\d+(?:\\.\\d+)?`,
    "m",
  );
  if (!pattern.test(patched)) {
    missing.push(id);
    continue;
  }
  patched = patched.replace(pattern, `$1x: ${coords.x}, y: ${coords.y}`);
  patchedCount += 1;
}

if (missing.length) {
  console.warn(
    `WARN: no pattern match for ${missing.length} ids: ${missing.join(", ")}`,
  );
}

await writeFile(MAP_PATH, patched, "utf8");

console.log(`Reprojected ${patchedCount} territories into ${MAP_PATH}`);
if (outOfExtent.length) {
  console.log(`\nOutside 0..${WORLD_W} x 0..${WORLD_H} extent:`);
  for (const r of outOfExtent) {
    console.log(`  ${r.id}: (${r.x}, ${r.y})`);
  }
}

// Spot-check examples the caller asked about.
const spotIds = ["japan", "united_kingdom", "russia", "eastern_usa", "hawaii"];
console.log("\nSpot checks:");
for (const id of spotIds) {
  const c = projected[id];
  if (c) console.log(`  ${id}: -> (${c.x}, ${c.y})`);
}
