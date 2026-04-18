#!/usr/bin/env node
/**
 * import-triplea-map.mjs
 *
 * Downloads TripleA's world_war_ii_v5_1942 map data (GPL v3) and generates
 * shared/src/map-geo.ts with territory polygon geometry scaled to our 2048×910 SVG canvas.
 *
 * Run from repo root:  node scripts/import-triplea-map.mjs
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

// TripleA GitHub raw URLs
const BASE = "https://raw.githubusercontent.com/triplea-maps/world_war_ii_v5_1942/master/map";
const POLYGONS_URL    = `${BASE}/polygons.txt`;
const CENTERS_URL     = `${BASE}/centers.txt`;
const PROPS_URL       = `${BASE}/map.properties`;
const BASE_MAP_URL    = `${BASE}/v5baseTiles.png`; // full 3500×2000 base terrain PNG

// TripleA's native canvas size — we use coordinates as-is, no scaling.
// Board.tsx WORLD_W / WORLD_H must match these values.
const TARGET_W = 3500;
const TARGET_H = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchText(url) {
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchBinary(url) {
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Parse polygons.txt — territories can have multiple polygon blocks. */
function parsePolygons(text) {
  /** @type {Map<string, number[][][]>} name → array-of-polygons, each polygon = [[x,y],...] */
  const result = new Map();

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(.+?)\s*<(.+?)>\s*$/);
    if (!match) continue;
    const name = match[1].trim();
    const coords = [];
    for (const m of match[2].matchAll(/\((\d+)\s*,\s*(\d+)\)/g)) {
      coords.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
    }
    if (coords.length < 3) continue; // degenerate polygon

    if (!result.has(name)) result.set(name, []);
    result.get(name).push(coords);
  }
  return result;
}

/** Parse centers.txt — one centroid per territory. */
function parseCenters(text) {
  /** @type {Map<string, [number,number]>} */
  const result = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(.+?)\s*\((\d+)\s*,\s*(\d+)\)/);
    if (!match) continue;
    result.set(match[1].trim(), [parseInt(match[2], 10), parseInt(match[3], 10)]);
  }
  return result;
}

/** Parse map.properties for map.width / map.height. */
function parseProps(text) {
  const w = text.match(/^map\.width\s*=\s*(\d+)/m);
  const h = text.match(/^map\.height\s*=\s*(\d+)/m);
  return {
    width:  w ? parseInt(w[1], 10) : null,
    height: h ? parseInt(h[1], 10) : null,
  };
}

// ---------------------------------------------------------------------------
// Name → internal ID mapping
// ---------------------------------------------------------------------------

/**
 * TripleA territory names → our internal snake_case IDs.
 * Keys are the exact strings from polygons.txt / centers.txt.
 *
 * Sea zones will be handled separately by the sz_N pattern below.
 * Unmapped names get auto-normalized via nameToId().
 */
const NAME_TO_ID = {
  // ── USSR ──────────────────────────────────────────────────────────────────
  "Russia":                       "russia",
  "Karelia S.S.R.":               "karelia",
  "Ukraine S.S.R.":               "ukraine",
  "Caucasus":                     "caucasus",
  "Archangel":                    "archangel",
  "Vologda":                      "vologda",
  "West Russia":                  "west_russia",
  "Belorussia":                   "belorussia",
  "Evenki National Okrug":        "evenki",
  "Novosibirsk":                  "novosibirsk",
  "Yakut S.S.R.":                 "yakut",
  "Buryatia S.S.R.":              "buryatia",
  "Soviet Far East":              "soviet_far_east",
  "Kazakh S.S.R.":                "kazakh",
  "Sinkiang":                     "sinkiang",
  "Mongolia":                     "mongolia",

  // ── EUROPE ────────────────────────────────────────────────────────────────
  "Germany":                      "germany_terr",
  "Northwestern Europe":          "northern_europe",
  "Southern Europe":              "southern_europe",
  "France":                       "france",
  "Poland":                       "poland",
  "Finland":                      "finland",
  "Norway":                       "norway",
  "Sweden":                       "sweden",
  "Baltic States":                "baltic_states",
  "Bulgaria Romania":             "balkans",
  "Italy":                        "italy",
  "Spain Portugal":               "spain_portugal",
  "Switzerland":                  "switzerland",
  "Turkey":                       "turkey",
  "Eire":                         "eire",
  "Gibraltar":                    "gibraltar",
  "Iceland":                      "iceland",
  "United Kingdom":               "united_kingdom",

  // ── AFRICA / MIDDLE EAST ─────────────────────────────────────────────────
  "Egypt":                        "egypt",
  "Libya":                        "libya",
  "Algeria":                      "algeria",
  "Morocco":                      "morocco",
  "Sahara":                       "sahara",
  "French West Africa":           "french_west_africa",
  "French Equatorial Africa":     "french_equatorial_africa",
  "Anglo-Egyptian Sudan":         "anglo_egyptian_sudan",
  "Belgian Congo":                "belgian_congo",
  "Italian East Africa":          "italian_east_africa",
  "East Africa":                  "east_africa",
  "Rhodesia":                     "rhodesia",
  "Mozambique":                   "mozambique",
  "Union of South Africa":        "south_africa",
  "Angola":                       "angola",
  "French Madagascar":            "madagascar",
  "Saudi Arabia":                 "saudi_arabia",
  "Trans-Jordan":                 "middle_east",
  "Persia":                       "persia",
  "Afghanistan":                  "afghanistan",

  // ── ASIA ──────────────────────────────────────────────────────────────────
  "India":                        "india",
  "Burma":                        "burma",
  "Himalaya":                     "himalaya",
  "Yunnan":                       "yunnan",
  "Szechwan":                     "szechwan",
  "Anhwei":                       "anhwei",
  "Kiangsu":                      "kiangsu",
  "Kwangtung":                    "kwangtung",
  "French Indo-China Thailand":   "french_indochina",
  "Malaya":                       "malaya",
  "Japan":                        "japan",
  "Korea":                        "korea",
  "Manchuria":                    "manchuria",
  "Okinawa":                      "okinawa",
  "Iwo Jima":                     "iwo_jima",
  "Formosa":                      "formosa",
  "Philippine Islands":           "philippines",
  "East Indies":                  "east_indies",
  "Borneo":                       "borneo",

  // ── OCEANIA ───────────────────────────────────────────────────────────────
  "Eastern Australia":            "eastern_australia",
  "Western Australia":            "western_australia",
  "New Zealand":                  "new_zealand",
  "New Guinea":                   "new_guinea",
  "Solomon Islands":              "solomon_is",
  "Caroline Islands":             "caroline_is",
  "Marshall Islands":             "marshall_is",
  "Midway":                       "midway",
  "Wake Island":                  "wake_island",
  "Hawaiian Islands":             "hawaii",

  // ── NORTH AMERICA ─────────────────────────────────────────────────────────
  "Alaska":                       "alaska",
  "Greenland":                    "greenland",
  "Western Canada":               "western_canada",
  "Eastern Canada":               "eastern_canada",
  "Western United States":        "western_usa",
  "Central United States":        "central_usa",
  "Eastern United States":        "eastern_usa",
  "Mexico":                       "mexico",
  "East Mexico":                  "east_mexico",
  "Central America":              "central_america",
  "West Indies":                  "west_indies",

  // ── SOUTH AMERICA ─────────────────────────────────────────────────────────
  "Brazil":                       "brazil",
  "Venezuela":                    "venezuela",
  "Colombia Ecuador":             "colombia_ecuador",
  "Peru Argentina":               "peru_argentina",
  "Chile":                        "chile",
};

/** Fallback normalization for unmapped names. */
function nameToId(name) {
  // Sea zones: "5 Sea Zone" or "Sea Zone 5" → "sz_5"
  const szMatch = name.match(/^(\d+)\s+Sea Zone$/i) || name.match(/^Sea Zone\s+(\d+)$/i);
  if (szMatch) return `sz_${szMatch[1]}`;

  // Normalize: lowercase, strip punctuation, collapse spaces to _
  return name
    .toLowerCase()
    .replace(/\.s\.s\.r\.?/g, "_ssr")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function resolveId(tripleaName) {
  return NAME_TO_ID[tripleaName] ?? nameToId(tripleaName);
}

// ---------------------------------------------------------------------------
// Coordinate scaling
// ---------------------------------------------------------------------------

function scalePoint(x, y, srcW, srcH) {
  return [
    Math.round((x / srcW) * TARGET_W),
    Math.round((y / srcH) * TARGET_H),
  ];
}

function scalePolygon(coords, srcW, srcH) {
  return coords.map(([x, y]) => scalePoint(x, y, srcW, srcH).join(",")).join(" ");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  console.log("=== import-triplea-map ===");

  // 1. Fetch raw data
  console.log("\n[1/5] Fetching TripleA map data...");
  const [polyText, centerText, propsText, mapPng] = await Promise.all([
    fetchText(POLYGONS_URL),
    fetchText(CENTERS_URL),
    fetchText(PROPS_URL).catch(() => {
      console.warn("  map.properties not found, using fallback dimensions");
      return "";
    }),
    fetchBinary(BASE_MAP_URL),
  ]);

  // 2. Save map PNG
  console.log("\n[2/5] Saving base map PNG...");
  const mapPngPath = path.join(REPO, "client", "public", "map-aa.png");
  await writeFile(mapPngPath, mapPng);
  console.log(`  Written: ${mapPngPath} (${(mapPng.length / 1024).toFixed(0)}KB)`);

  // 3. Parse
  console.log("\n[3/5] Parsing...");
  const polygons = parsePolygons(polyText);
  const centers  = parseCenters(centerText);
  const props    = parseProps(propsText);

  // Determine source dimensions
  let SRC_W = props.width;
  let SRC_H = props.height;
  if (!SRC_W || !SRC_H) {
    // Infer from maximum coordinate in polygons (conservative estimate)
    let maxX = 0, maxY = 0;
    for (const polys of polygons.values()) {
      for (const poly of polys) {
        for (const [x, y] of poly) {
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    SRC_W = maxX + 1;
    SRC_H = maxY + 1;
    console.log(`  Inferred source dimensions: ${SRC_W}×${SRC_H}`);
  } else {
    console.log(`  Source map dimensions: ${SRC_W}×${SRC_H}`);
  }

  console.log(`  Territories in polygons.txt: ${polygons.size}`);
  console.log(`  Territories in centers.txt: ${centers.size}`);

  // 4. Build geo entries
  console.log("\n[4/5] Building geometry entries...");

  /** @type {Array<{id: string, tripleaName: string, polygons: string[], centroid: [number,number]}>} */
  const entries = [];

  for (const [name, polyList] of polygons.entries()) {
    const id = resolveId(name);
    const scaledPolys = polyList.map(coords => scalePolygon(coords, SRC_W, SRC_H));

    // Centroid from centers.txt if available, otherwise compute polygon centroid
    let centroid;
    if (centers.has(name)) {
      const [cx, cy] = centers.get(name);
      centroid = scalePoint(cx, cy, SRC_W, SRC_H);
    } else {
      // Fallback: average of first polygon's vertices
      const pts = polyList[0];
      const avgX = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const avgY = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      centroid = scalePoint(Math.round(avgX), Math.round(avgY), SRC_W, SRC_H);
    }

    entries.push({ id, tripleaName: name, polygons: scaledPolys, centroid });
  }

  // Sort: land territories first, sea zones last; alphabetical within group
  entries.sort((a, b) => {
    const aSea = a.id.startsWith("sz_");
    const bSea = b.id.startsWith("sz_");
    if (aSea !== bSea) return aSea ? 1 : -1;
    return a.id.localeCompare(b.id);
  });

  // Detect duplicate IDs (shouldn't happen but good to know)
  const idCounts = new Map();
  for (const e of entries) idCounts.set(e.id, (idCounts.get(e.id) ?? 0) + 1);
  for (const [id, count] of idCounts.entries()) {
    if (count > 1) console.warn(`  WARN: duplicate id "${id}" (${count} entries)`);
  }

  // 5. Emit TypeScript
  console.log("\n[5/5] Writing shared/src/map-geo.ts...");

  const seaCount  = entries.filter(e => e.id.startsWith("sz_")).length;
  const landCount = entries.length - seaCount;

  const lines = [
    `/**`,
    ` * map-geo.ts — Auto-generated by scripts/import-triplea-map.mjs`,
    ` * Source: TripleA world_war_ii_v5_1942 (GPL v3)`,
    ` * https://github.com/triplea-maps/world_war_ii_v5_1942`,
    ` *`,
    ` * ${landCount} land territories + ${seaCount} sea zones`,
    ` * Coordinates scaled to ${TARGET_W}×${TARGET_H} SVG canvas.`,
    ` * Do NOT edit manually — re-run: node scripts/import-triplea-map.mjs`,
    ` */`,
    ``,
    `export interface TerritoryGeo {`,
    `  /** TripleA source name for debugging */`,
    `  name: string;`,
    `  /** SVG "points" attribute strings — one per polygon part (islands, etc.) */`,
    `  polygons: string[];`,
    `  /** Center for unit stack / label placement */`,
    `  centroid: [number, number];`,
    `}`,
    ``,
    `export const TERRITORY_GEO: Record<string, TerritoryGeo> = {`,
  ];

  for (const e of entries) {
    // Indent polygon strings safely — embed as JSON string literals
    const polyStr = JSON.stringify(e.polygons);
    lines.push(
      `  ${JSON.stringify(e.id)}: {`,
      `    name: ${JSON.stringify(e.tripleaName)},`,
      `    polygons: ${polyStr},`,
      `    centroid: [${e.centroid[0]}, ${e.centroid[1]}],`,
      `  },`,
    );
  }

  lines.push(`};`);
  lines.push(``);

  const outPath = path.join(REPO, "shared", "src", "map-geo.ts");
  await writeFile(outPath, lines.join("\n"), "utf8");

  console.log(`  Written: ${outPath}`);
  console.log(`  Total entries: ${entries.length} (${landCount} land, ${seaCount} sea)`);

  // Summary table
  console.log("\n=== Summary ===");
  console.log(`Source dimensions : ${SRC_W}×${SRC_H}`);
  console.log(`Target canvas     : ${TARGET_W}×${TARGET_H}`);
  console.log(`Land territories  : ${landCount}`);
  console.log(`Sea zones         : ${seaCount}`);
  console.log(`\nDone!`);
})();
