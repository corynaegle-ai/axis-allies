#!/usr/bin/env node
/**
 * generate-map-ts.mjs
 *
 * Rebuilds shared/src/map.ts territory data using:
 * - TripleA adjacency graph (from the XML, pre-parsed below)
 * - Centroid positions from shared/src/map-geo.ts
 * - Official A&A 1942 2E starting ownership
 *
 * Run: node scripts/generate-map-ts.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const MAP_GEO_PATH = path.join(REPO, "shared", "src", "map-geo.ts");
const MAP_PATH     = path.join(REPO, "shared", "src", "map.ts");

// ---------------------------------------------------------------------------
// Load centroids from map-geo.ts
// ---------------------------------------------------------------------------
const geoSrc = readFileSync(MAP_GEO_PATH, "utf8");
const centroids = {};
for (const m of geoSrc.matchAll(/"([^"]+)": \{[\s\S]*?centroid: \[(\d+), (\d+)\]/g)) {
  centroids[m[1]] = [parseInt(m[2]), parseInt(m[3])];
}
console.log(`Loaded ${Object.keys(centroids).length} centroids`);

// ---------------------------------------------------------------------------
// Territory adjacency (from TripleA XML, bidirectional)
// ---------------------------------------------------------------------------
const ADJACENCY = {"sz_1":["eastern_canada","sz_10","sz_2"],"sz_2":["greenland","sz_1","sz_10","sz_3","sz_7","sz_9"],"sz_3":["finland","iceland","norway","sz_2","sz_4","sz_6","sz_7"],"sz_4":["archangel","karelia","sz_3"],"sz_5":["baltic_states","finland","germany_terr","karelia","northern_europe","norway","sweden","sz_6"],"sz_6":["northern_europe","norway","sz_3","sz_5","sz_7","sz_8","united_kingdom"],"sz_7":["eire","sz_2","sz_3","sz_6","sz_8","sz_9","united_kingdom"],"sz_8":["eire","france","northern_europe","sz_13","sz_6","sz_7","sz_9","united_kingdom"],"sz_9":["sz_10","sz_12","sz_13","sz_2","sz_7","sz_8"],"sz_10":["eastern_canada","sz_1","sz_11","sz_12","sz_2","sz_9"],"sz_11":["central_united_states","east_mexico","eastern_united_states","sz_10","sz_12","sz_18"],"sz_12":["sz_10","sz_11","sz_13","sz_18","sz_22","sz_23","sz_9"],"sz_13":["gibraltar","morocco","spain_portugal","sz_12","sz_14","sz_23","sz_8","sz_9"],"sz_14":["algeria","france","gibraltar","morocco","spain_portugal","sz_13","sz_15"],"sz_15":["italy","libya","southern_europe","sz_14","sz_16","sz_17","turkey"],"sz_16":["balkans","caucasus","sz_15","turkey","ukraine"],"sz_17":["egypt","middle_east","sz_15","sz_34","turkey"],"sz_18":["central_america","colombia_equador","east_mexico","sz_11","sz_12","sz_19","sz_22","venezuela","west_indies"],"sz_19":["central_america","colombia_equador","east_mexico","peru_argentina","sz_18","sz_20","sz_55"],"sz_20":["chile","sz_19","sz_21","sz_42"],"sz_21":["chile","peru_argentina","sz_20","sz_22","sz_25","sz_26","sz_41"],"sz_22":["brazil","sz_12","sz_18","sz_21","sz_23","sz_25"],"sz_23":["french_west_africa","sahara","sz_12","sz_13","sz_22","sz_24","sz_25"],"sz_24":["belgian_congo","french_equatorial_africa","sz_23","sz_25","sz_27"],"sz_25":["sz_21","sz_22","sz_23","sz_24","sz_26","sz_27"],"sz_26":["sz_21","sz_25","sz_27"],"sz_27":["angola","south_africa","sz_24","sz_25","sz_26","sz_28"],"sz_28":["madagascar","mozambique","south_africa","sz_27","sz_29","sz_33"],"sz_29":["madagascar","sz_28","sz_30","sz_31","sz_32"],"sz_30":["sz_29","sz_31","sz_37","sz_38"],"sz_31":["sz_29","sz_30","sz_32","sz_35","sz_37"],"sz_32":["madagascar","sz_29","sz_31","sz_33","sz_34","sz_35"],"sz_33":["italian_east_africa","madagascar","mozambique","rhodesia","sz_28","sz_32","sz_34"],"sz_34":["anglo_egyptian_sudan","egypt","italian_east_africa","middle_east","persia","saudi_arabia","sz_17","sz_32","sz_33","sz_35"],"sz_35":["india","sz_31","sz_32","sz_34","sz_36","sz_37"],"sz_36":["burma","french_indochina","malaya","sz_35","sz_37","sz_47","sz_48","sz_61"],"sz_37":["east_indies","sz_30","sz_31","sz_35","sz_36","sz_38","sz_46","sz_47"],"sz_38":["sz_30","sz_37","sz_39","sz_46","western_australia"],"sz_39":["eastern_australia","sz_38","sz_40","sz_45"],"sz_40":["new_zealand","sz_39","sz_41","sz_43","sz_44","sz_45"],"sz_41":["sz_21","sz_40","sz_42","sz_43"],"sz_42":["sz_20","sz_41","sz_43","sz_54","sz_55"],"sz_43":["sz_40","sz_41","sz_42","sz_44","sz_53","sz_54"],"sz_44":["solomon_islands","sz_40","sz_43","sz_45","sz_49","sz_50","sz_52","sz_53"],"sz_45":["eastern_australia","sz_39","sz_40","sz_44","sz_46","sz_49"],"sz_46":["sz_37","sz_38","sz_45","sz_47","sz_49","western_australia"],"sz_47":["borneo","sz_36","sz_37","sz_46","sz_48","sz_49"],"sz_48":["philippines","sz_36","sz_47","sz_49","sz_50","sz_51","sz_60","sz_61"],"sz_49":["new_guinea","sz_44","sz_45","sz_46","sz_47","sz_48","sz_50"],"sz_50":["caroline_islands","sz_44","sz_48","sz_49","sz_51","sz_52"],"sz_51":["okinawa","sz_48","sz_50","sz_52","sz_59","sz_60"],"sz_52":["sz_44","sz_50","sz_51","sz_53","sz_57","sz_59","wake_island"],"sz_53":["hawaii","sz_43","sz_44","sz_52","sz_54","sz_56","sz_57"],"sz_54":["sz_42","sz_43","sz_53","sz_55","sz_56"],"sz_55":["mexico","sz_19","sz_42","sz_54","sz_56"],"sz_56":["sz_53","sz_54","sz_55","sz_57","sz_65","western_united_states"],"sz_57":["midway","sz_52","sz_53","sz_56","sz_58","sz_59","sz_64","sz_65"],"sz_58":["sz_57","sz_59","sz_60","sz_63","sz_64"],"sz_59":["iwo_jima","sz_51","sz_52","sz_57","sz_58","sz_60"],"sz_60":["japan","sz_48","sz_51","sz_58","sz_59","sz_61","sz_62","sz_63"],"sz_61":["formosa","kiangsu","kwangtung","sz_36","sz_48","sz_60","sz_62","yunnan"],"sz_62":["buryatia","japan","manchuria","sz_60","sz_61","sz_63"],"sz_63":["buryatia","soviet_far_east","sz_58","sz_60","sz_62","sz_64"],"sz_64":["alaska","sz_57","sz_58","sz_63","sz_65"],"sz_65":["alaska","sz_56","sz_57","sz_64","western_canada"],"afghanistan":["himalaya","india","kazakh","persia","szechwan"],"alaska":["sz_64","sz_65","western_canada"],"algeria":["libya","morocco","sahara","sz_14"],"anglo_egyptian_sudan":["belgian_congo","egypt","french_equatorial_africa","italian_east_africa","rhodesia","sahara","sz_34"],"angola":["belgian_congo","south_africa","sz_27"],"anhwei":["kiangsu","kwangtung","manchuria","mongolia","sinkiang","szechwan"],"archangel":["evenki","karelia","russia","sz_4","vologda","west_russia"],"baltic_states":["belorussia","germany_terr","karelia","poland","sz_5"],"belgian_congo":["anglo_egyptian_sudan","angola","french_equatorial_africa","rhodesia","south_africa","sz_24"],"belorussia":["baltic_states","karelia","poland","ukraine","west_russia"],"borneo":["sz_47"],"brazil":["colombia_equador","peru_argentina","sz_22","venezuela"],"balkans":["germany_terr","poland","southern_europe","sz_16","turkey","ukraine"],"burma":["french_indochina","himalaya","india","sz_36","yunnan"],"buryatia":["manchuria","mongolia","soviet_far_east","sz_62","sz_63","yakut"],"caroline_islands":["sz_50"],"caucasus":["kazakh","persia","russia","sz_16","turkey","ukraine","west_russia"],"central_america":["colombia_equador","east_mexico","sz_18","sz_19"],"central_united_states":["east_mexico","eastern_canada","eastern_united_states","sz_11","western_united_states"],"chile":["peru_argentina","sz_20","sz_21"],"colombia_equador":["brazil","central_america","peru_argentina","sz_18","sz_19","venezuela"],"east_indies":["sz_37"],"east_mexico":["central_america","central_united_states","mexico","sz_11","sz_18","sz_19"],"eastern_australia":["sz_39","sz_45","western_australia"],"eastern_canada":["central_united_states","eastern_united_states","sz_1","sz_10","western_canada"],"eastern_united_states":["central_united_states","eastern_canada","sz_11"],"egypt":["anglo_egyptian_sudan","libya","middle_east","sahara","sz_17","sz_34"],"eire":["sz_7","sz_8","united_kingdom"],"evenki":["archangel","mongolia","novosibirsk","sinkiang","vologda","yakut"],"finland":["karelia","norway","sweden","sz_3","sz_5"],"formosa":["sz_61"],"france":["germany_terr","italy","northern_europe","spain_portugal","switzerland","sz_14","sz_8"],"french_equatorial_africa":["anglo_egyptian_sudan","belgian_congo","french_west_africa","sahara","sz_24"],"french_indochina":["burma","malaya","sz_36","yunnan"],"madagascar":["sz_28","sz_29","sz_32","sz_33"],"french_west_africa":["french_equatorial_africa","sahara","sz_23"],"germany_terr":["balkans","baltic_states","france","italy","northern_europe","poland","southern_europe","switzerland","sz_5"],"gibraltar":["spain_portugal","sz_13","sz_14"],"greenland":["sz_2"],"hawaii":["sz_53"],"himalaya":["afghanistan","burma","india","szechwan","yunnan"],"iceland":["sz_3"],"india":["afghanistan","burma","himalaya","persia","sz_35"],"italian_east_africa":["anglo_egyptian_sudan","rhodesia","sz_33","sz_34"],"italy":["france","germany_terr","southern_europe","switzerland","sz_15"],"iwo_jima":["sz_59"],"japan":["sz_60","sz_62"],"karelia":["archangel","baltic_states","belorussia","finland","sz_4","sz_5","west_russia"],"kazakh":["afghanistan","caucasus","novosibirsk","persia","russia","sinkiang","szechwan"],"kiangsu":["anhwei","kwangtung","manchuria","sz_61"],"kwangtung":["anhwei","kiangsu","sz_61","szechwan","yunnan"],"libya":["algeria","egypt","sahara","sz_15"],"malaya":["french_indochina","sz_36"],"manchuria":["anhwei","buryatia","kiangsu","mongolia","sz_62"],"mexico":["east_mexico","sz_55","western_united_states"],"midway":["sz_57"],"mongolia":["anhwei","buryatia","evenki","manchuria","sinkiang","yakut"],"morocco":["algeria","sahara","sz_13","sz_14"],"mozambique":["rhodesia","south_africa","sz_28","sz_33"],"new_guinea":["sz_49"],"new_zealand":["sz_40"],"northern_europe":["france","germany_terr","sz_5","sz_6","sz_8"],"norway":["finland","sweden","sz_3","sz_5","sz_6"],"novosibirsk":["evenki","kazakh","russia","sinkiang","vologda"],"okinawa":["sz_51"],"persia":["afghanistan","caucasus","india","kazakh","middle_east","sz_34","turkey"],"peru_argentina":["brazil","chile","colombia_equador","sz_19","sz_21"],"philippines":["sz_48"],"poland":["balkans","baltic_states","belorussia","germany_terr","ukraine"],"rhodesia":["anglo_egyptian_sudan","belgian_congo","italian_east_africa","mozambique","south_africa","sz_33"],"russia":["archangel","caucasus","kazakh","novosibirsk","vologda","west_russia"],"sahara":["algeria","anglo_egyptian_sudan","egypt","french_equatorial_africa","french_west_africa","libya","morocco","sz_23"],"saudi_arabia":["middle_east","sz_34"],"sinkiang":["anhwei","evenki","kazakh","mongolia","novosibirsk","szechwan"],"solomon_islands":["sz_44"],"southern_europe":["balkans","germany_terr","italy","sz_15","turkey"],"soviet_far_east":["buryatia","sz_63","yakut"],"spain_portugal":["france","gibraltar","sz_13","sz_14"],"sweden":["finland","norway","sz_5"],"switzerland":["france","germany_terr","italy"],"szechwan":["afghanistan","anhwei","himalaya","kazakh","kwangtung","sinkiang","yunnan"],"middle_east":["egypt","persia","saudi_arabia","sz_17","sz_34","turkey"],"turkey":["balkans","caucasus","middle_east","persia","southern_europe","sz_15","sz_16","sz_17"],"ukraine":["balkans","belorussia","caucasus","poland","sz_16","west_russia"],"south_africa":["angola","belgian_congo","mozambique","rhodesia","sz_27","sz_28"],"united_kingdom":["eire","sz_6","sz_7","sz_8"],"venezuela":["brazil","colombia_equador","sz_18"],"vologda":["archangel","evenki","novosibirsk","russia"],"wake_island":["sz_52"],"west_indies":["sz_18"],"west_russia":["archangel","belorussia","caucasus","karelia","russia","ukraine"],"western_australia":["eastern_australia","sz_38","sz_46"],"western_canada":["alaska","eastern_canada","sz_65","western_united_states"],"western_united_states":["central_united_states","mexico","sz_56","western_canada"],"yakut":["buryatia","evenki","mongolia","soviet_far_east"],"yunnan":["burma","french_indochina","himalaya","kwangtung","sz_61","szechwan"]};

// ---------------------------------------------------------------------------
// Official A&A 1942 2E starting ownership
// ---------------------------------------------------------------------------
const OWNER = {
  // ── RUSSIA ──
  russia: "russia", karelia: "russia", ukraine: "russia", caucasus: "russia",
  archangel: "russia", vologda: "russia", west_russia: "russia", belorussia: "russia",
  baltic_states: "russia", evenki: "russia", novosibirsk: "russia", yakut: "russia",
  buryatia: "russia", soviet_far_east: "russia", sinkiang: "russia", mongolia: "russia",
  kazakh: "russia",

  // ── GERMANY ──
  germany_terr: "germany", northern_europe: "germany", southern_europe: "germany",
  france: "germany", poland: "germany", italy: "germany", norway: "germany",
  finland: "germany", balkans: "germany",
  libya: "germany", algeria: "germany", french_west_africa: "germany",
  french_equatorial_africa: "germany", sahara: "germany", morocco: "germany",

  // ── UK ──
  united_kingdom: "uk", eastern_canada: "uk", western_canada: "uk",
  eastern_australia: "uk", western_australia: "uk", new_zealand: "uk",
  india: "uk", egypt: "uk", middle_east: "uk", persia: "uk", afghanistan: "uk",
  south_africa: "uk", belgian_congo: "uk", rhodesia: "uk", italian_east_africa: "uk",
  anglo_egyptian_sudan: "uk", mozambique: "uk", madagascar: "uk",
  new_guinea: "uk", solomon_islands: "uk",
  greenland: "uk", iceland: "uk", eire: "uk", gibraltar: "uk", west_indies: "uk",
  brazil: "uk", peru_argentina: "uk", colombia_equador: "uk", venezuela: "uk", chile: "uk",

  // ── JAPAN ──
  japan: "japan", manchuria: "japan", french_indochina: "japan",
  anhwei: "japan", kiangsu: "japan", kwangtung: "japan", szechwan: "japan",
  yunnan: "japan", himalaya: "japan",
  philippines: "japan", borneo: "japan", east_indies: "japan", malaya: "japan",
  burma: "japan",
  okinawa: "japan", iwo_jima: "japan", caroline_islands: "japan",
  wake_island: "japan", formosa: "japan",

  // ── USA ──
  eastern_united_states: "usa", central_united_states: "usa", western_united_states: "usa",
  mexico: "usa", east_mexico: "usa", central_america: "usa", hawaii: "usa", alaska: "usa",

  // ── NEUTRAL (null) ──
  sweden: null, switzerland: null, turkey: null, spain_portugal: null,
  saudi_arabia: null, midway: null,
  // Islands with no starting owner
  angola: null,
};

// ---------------------------------------------------------------------------
// IPC values (from TripleA XML)
// ---------------------------------------------------------------------------
const IPC = {
  afghanistan:0, alaska:2, algeria:1, anglo_egyptian_sudan:0, angola:0,
  anhwei:1, archangel:1, balkans:2, baltic_states:2, belgian_congo:1,
  belorussia:2, borneo:4, brazil:3, burma:1, buryatia:1,
  caroline_islands:0, caucasus:4, central_america:1, central_united_states:6, chile:0,
  colombia_equador:0, east_indies:4, east_mexico:0, eastern_australia:1,
  eastern_canada:3, eastern_united_states:12, egypt:2, eire:0, evenki:1,
  finland:1, formosa:0, france:6, french_equatorial_africa:1, french_indochina:2,
  french_west_africa:1, germany_terr:10, gibraltar:0, greenland:0, hawaii:1,
  himalaya:0, iceland:0, india:3, italian_east_africa:1, italy:3, iwo_jima:0,
  japan:8, karelia:2, kazakh:2, kiangsu:2, kwangtung:2, libya:1, madagascar:1,
  malaya:1, manchuria:3, mexico:2, middle_east:1, midway:0, mongolia:0,
  morocco:1, mozambique:0, new_guinea:1, new_zealand:1, northern_europe:2,
  norway:2, novosibirsk:1, okinawa:0, persia:1, peru_argentina:0, philippines:3,
  poland:2, rhodesia:1, russia:8, sahara:0, saudi_arabia:0, sinkiang:1,
  solomon_islands:0, south_africa:2, southern_europe:2, soviet_far_east:1,
  spain_portugal:0, sweden:0, switzerland:0, szechwan:1, middle_east_renamed:1,
  turkey:0, ukraine:2, united_kingdom:8, venezuela:0, vologda:2,
  wake_island:0, west_indies:1, west_russia:2, western_australia:1,
  western_canada:1, western_united_states:10, yakut:1, yunnan:1,
};

// ---------------------------------------------------------------------------
// Territory display names
// ---------------------------------------------------------------------------
const NAMES = {
  germany_terr: "Germany", central_united_states: "C. United States",
  eastern_united_states: "E. United States", western_united_states: "W. United States",
  eastern_canada: "E. Canada", western_canada: "W. Canada",
  eastern_australia: "E. Australia", western_australia: "W. Australia",
  northern_europe: "N. Europe", southern_europe: "S. Europe",
  soviet_far_east: "Soviet Far East", french_indochina: "Fr. Indochina",
  french_west_africa: "Fr. W. Africa", french_equatorial_africa: "Fr. Eq. Africa",
  middle_east: "Trans-Jordan", anglo_egyptian_sudan: "Anglo-Egypt Sudan",
  italian_east_africa: "Ital. E. Africa", south_africa: "S. Africa",
  belgian_congo: "Belgian Congo", peru_argentina: "Peru/Argentina",
  colombia_equador: "Colombia/Ecuador", west_russia: "W. Russia",
  west_indies: "W. Indies", central_america: "Central America",
  east_mexico: "E. Mexico", caroline_islands: "Caroline Is.",
  solomon_islands: "Solomon Is.", united_kingdom: "United Kingdom",
  saudi_arabia: "Saudi Arabia", spain_portugal: "Spain/Portugal",
};

function getName(id) {
  if (NAMES[id]) return NAMES[id];
  // sea zones
  const szMatch = id.match(/^sz_(\d+)$/);
  if (szMatch) return `Sea Zone ${szMatch[1]}`;
  // capitalize + replace underscores
  return id.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// ---------------------------------------------------------------------------
// Build territory list
// ---------------------------------------------------------------------------
// Full list combining land and sea territories from TripleA
const LAND_IDS = [
  // USSR
  "russia","karelia","ukraine","caucasus","archangel","vologda","west_russia","belorussia",
  "baltic_states","evenki","novosibirsk","yakut","buryatia","soviet_far_east","sinkiang",
  "mongolia","kazakh",
  // Germany
  "germany_terr","northern_europe","southern_europe","france","poland","italy","norway",
  "finland","balkans","sweden","switzerland","spain_portugal","eire","gibraltar","iceland",
  // Africa / Middle East
  "morocco","algeria","libya","sahara","french_west_africa","french_equatorial_africa",
  "anglo_egyptian_sudan","belgian_congo","italian_east_africa","rhodesia","mozambique",
  "angola","south_africa","madagascar","egypt","middle_east","saudi_arabia","turkey",
  "persia","afghanistan",
  // UK
  "united_kingdom","eastern_canada","western_canada","greenland","west_indies",
  // South America
  "brazil","colombia_equador","venezuela","peru_argentina","chile","central_america",
  // USA
  "eastern_united_states","central_united_states","western_united_states",
  "east_mexico","mexico","alaska","hawaii",
  // Asia
  "india","burma","malaya","himalaya","french_indochina","yunnan","szechwan","anhwei",
  "kiangsu","kwangtung","manchuria","mongolia",
  // Pacific Islands
  "japan","okinawa","iwo_jima","formosa","philippines","borneo","east_indies",
  "caroline_islands","new_guinea","solomon_islands","eastern_australia","western_australia",
  "new_zealand","wake_island","midway",
];

// Deduplicate (mongolia appears twice above, remove dup)
const seenLand = new Set();
const LAND_IDS_DEDUP = [];
for (const id of LAND_IDS) {
  if (!seenLand.has(id)) { seenLand.add(id); LAND_IDS_DEDUP.push(id); }
}

const SEA_IDS = Array.from({ length: 65 }, (_, i) => `sz_${i + 1}`);

// ---------------------------------------------------------------------------
// Starting setup (A&A 1942 2E, updated IDs)
// ---------------------------------------------------------------------------
function buildStartingSetup() {
  const lines = [];
  lines.push(`export interface StartingUnit {`);
  lines.push(`  territory: string;`);
  lines.push(`  owner: PowerId;`);
  lines.push(`  units: Partial<Record<UnitId, number>>;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export const STARTING_SETUP: StartingUnit[] = [`);

  const entries = [
    // RUSSIA
    `  { territory: "russia", owner: "russia", units: { infantry: 4, artillery: 1, tank: 2, fighter: 1, factory: 1, aa: 1 } },`,
    `  { territory: "karelia", owner: "russia", units: { infantry: 3, aa: 1 } },`,
    `  { territory: "ukraine", owner: "russia", units: { infantry: 3, artillery: 1 } },`,
    `  { territory: "caucasus", owner: "russia", units: { infantry: 3, tank: 1, factory: 1, aa: 1 } },`,
    `  { territory: "archangel", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "vologda", owner: "russia", units: { infantry: 2 } },`,
    `  { territory: "west_russia", owner: "russia", units: { infantry: 2 } },`,
    `  { territory: "belorussia", owner: "russia", units: { infantry: 2 } },`,
    `  { territory: "baltic_states", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "evenki", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "novosibirsk", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "buryatia", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "yakut", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "soviet_far_east", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "sinkiang", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "mongolia", owner: "russia", units: { infantry: 1 } },`,
    `  { territory: "kazakh", owner: "russia", units: { infantry: 2 } },`,
    `  { territory: "sz_4", owner: "russia", units: { destroyer: 1, submarine: 1 } },`,
    // GERMANY
    `  { territory: "germany_terr", owner: "germany", units: { infantry: 4, artillery: 1, tank: 2, fighter: 2, bomber: 1, aa: 1, factory: 1 } },`,
    `  { territory: "northern_europe", owner: "germany", units: { infantry: 2, artillery: 1, tank: 1 } },`,
    `  { territory: "southern_europe", owner: "germany", units: { infantry: 2, fighter: 1, factory: 1 } },`,
    `  { territory: "france", owner: "germany", units: { infantry: 2, tank: 1 } },`,
    `  { territory: "poland", owner: "germany", units: { infantry: 2 } },`,
    `  { territory: "balkans", owner: "germany", units: { infantry: 1 } },`,
    `  { territory: "norway", owner: "germany", units: { infantry: 2 } },`,
    `  { territory: "finland", owner: "germany", units: { infantry: 2 } },`,
    `  { territory: "italy", owner: "germany", units: { infantry: 2, artillery: 1 } },`,
    `  { territory: "libya", owner: "germany", units: { infantry: 1, tank: 1 } },`,
    `  { territory: "algeria", owner: "germany", units: { infantry: 1 } },`,
    `  { territory: "french_west_africa", owner: "germany", units: { infantry: 1 } },`,
    `  { territory: "sz_5", owner: "germany", units: { submarine: 1, transport: 1 } },`,
    `  { territory: "sz_15", owner: "germany", units: { cruiser: 1, transport: 1 } },`,
    // UK
    `  { territory: "united_kingdom", owner: "uk", units: { infantry: 2, artillery: 1, tank: 1, fighter: 2, bomber: 1, aa: 1, factory: 1 } },`,
    `  { territory: "eastern_canada", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "india", owner: "uk", units: { infantry: 2, artillery: 1, fighter: 1, factory: 1 } },`,
    `  { territory: "egypt", owner: "uk", units: { infantry: 1, tank: 1 } },`,
    `  { territory: "eastern_australia", owner: "uk", units: { infantry: 1, fighter: 1 } },`,
    `  { territory: "south_africa", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "new_zealand", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "middle_east", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "persia", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "afghanistan", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "italian_east_africa", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "belgian_congo", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "rhodesia", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "madagascar", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "solomon_islands", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "brazil", owner: "uk", units: { infantry: 1 } },`,
    `  { territory: "sz_7", owner: "uk", units: { battleship: 1, destroyer: 1, transport: 1 } },`,
    `  { territory: "sz_8", owner: "uk", units: { cruiser: 1 } },`,
    `  { territory: "sz_35", owner: "uk", units: { destroyer: 1, transport: 1 } },`,
    // JAPAN
    `  { territory: "japan", owner: "japan", units: { infantry: 3, artillery: 1, fighter: 2, aa: 1, factory: 1 } },`,
    `  { territory: "manchuria", owner: "japan", units: { infantry: 3, artillery: 1 } },`,
    `  { territory: "french_indochina", owner: "japan", units: { infantry: 2, tank: 1 } },`,
    `  { territory: "kwangtung", owner: "japan", units: { infantry: 2 } },`,
    `  { territory: "kiangsu", owner: "japan", units: { infantry: 2 } },`,
    `  { territory: "anhwei", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "szechwan", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "yunnan", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "philippines", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "east_indies", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "borneo", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "new_guinea", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "iwo_jima", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "okinawa", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "caroline_islands", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "wake_island", owner: "japan", units: { infantry: 1 } },`,
    `  { territory: "sz_60", owner: "japan", units: { battleship: 1, carrier: 1, fighter: 1, destroyer: 1, submarine: 1, transport: 1 } },`,
    `  { territory: "sz_62", owner: "japan", units: { cruiser: 1, transport: 1 } },`,
    // USA
    `  { territory: "eastern_united_states", owner: "usa", units: { infantry: 3, artillery: 1, tank: 1, fighter: 1, bomber: 1, aa: 1, factory: 1 } },`,
    `  { territory: "central_united_states", owner: "usa", units: { infantry: 1 } },`,
    `  { territory: "western_united_states", owner: "usa", units: { infantry: 2, tank: 1, fighter: 1, factory: 1 } },`,
    `  { territory: "alaska", owner: "usa", units: { infantry: 1 } },`,
    `  { territory: "hawaii", owner: "usa", units: { infantry: 1 } },`,
    `  { territory: "mexico", owner: "usa", units: { infantry: 1 } },`,
    `  { territory: "sz_11", owner: "usa", units: { battleship: 1, transport: 1 } },`,
    `  { territory: "sz_53", owner: "usa", units: { carrier: 1, fighter: 1, destroyer: 1, submarine: 1, transport: 1 } },`,
  ];

  for (const e of entries) lines.push(e);
  lines.push(`];`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Generate TypeScript
// ---------------------------------------------------------------------------
const lines = [];

lines.push(`import type { Power, Territory, UnitId, PowerId } from "./types.js";`);
lines.push(``);
lines.push(`export const POWERS: Record<PowerId, Power> = {`);
lines.push(`  russia: { id: "russia", name: "Russia", alliance: "allies", color: "#a33032", accent: "#6e1d1e", capital: "russia", turnOrder: 1 },`);
lines.push(`  germany: { id: "germany", name: "Germany", alliance: "axis", color: "#6a6a6a", accent: "#3a3a3a", capital: "germany_terr", turnOrder: 2 },`);
lines.push(`  uk: { id: "uk", name: "United Kingdom", alliance: "allies", color: "#c6a24f", accent: "#7c6327", capital: "united_kingdom", turnOrder: 3 },`);
lines.push(`  japan: { id: "japan", name: "Japan", alliance: "axis", color: "#e39a46", accent: "#8a5618", capital: "japan", turnOrder: 4 },`);
lines.push(`  usa: { id: "usa", name: "United States", alliance: "allies", color: "#3e7a5c", accent: "#1f3d2e", capital: "eastern_united_states", turnOrder: 5 },`);
lines.push(`};`);
lines.push(``);
lines.push(`export const POWER_ORDER: PowerId[] = ["russia", "germany", "uk", "japan", "usa"];`);
lines.push(``);
lines.push(`/**`);
lines.push(` * TERRITORIES — Axis & Allies 1942 2E complete territory list.`);
lines.push(` * Coordinates from TripleA world_war_ii_v5_1942 map-geo.ts centroids.`);
lines.push(` * Adjacency from TripleA WW2v5_1942_2nd_TR.xml.`);
lines.push(` */`);
lines.push(`export const TERRITORIES: Territory[] = [`);
lines.push(`  // ========= LAND TERRITORIES =========`);

for (const id of LAND_IDS_DEDUP) {
  const adj = ADJACENCY[id] ?? [];
  const owner = OWNER[id] ?? null;
  const ipc = IPC[id] ?? 0;
  const name = getName(id);
  const [cx, cy] = centroids[id] ?? [0, 0];
  const ownerStr = owner ? `"${owner}"` : "undefined";
  const adjStr = JSON.stringify(adj.sort());
  lines.push(`  { id: "${id}", name: "${name}", terrain: "land", ipc: ${ipc}, originalOwner: ${ownerStr},`);
  lines.push(`    x: ${cx}, y: ${cy}, neighbors: ${adjStr} },`);
}

lines.push(`  // ========= SEA ZONES =========`);
for (const id of SEA_IDS) {
  const adj = ADJACENCY[id] ?? [];
  const [cx, cy] = centroids[id] ?? [0, 0];
  const adjStr = JSON.stringify(adj.sort());
  lines.push(`  { id: "${id}", name: "Sea Zone ${id.slice(3)}", terrain: "sea", ipc: 0,`);
  lines.push(`    x: ${cx}, y: ${cy}, neighbors: ${adjStr} },`);
}

lines.push(`];`);
lines.push(``);
lines.push(`export const TERRITORY_MAP: Record<string, Territory> =`);
lines.push(`  Object.fromEntries(TERRITORIES.map((t) => [t.id, t]));`);
lines.push(``);

// STARTING_SETUP — updated for full territory list
lines.push(buildStartingSetup());
lines.push(``);

const output = lines.join("\n");
writeFileSync(MAP_PATH, output, "utf8");
console.log(`Written: ${MAP_PATH}`);
console.log(`Land territories: ${LAND_IDS_DEDUP.length}`);
console.log(`Sea zones: ${SEA_IDS.length}`);
console.log(`Total: ${LAND_IDS_DEDUP.length + SEA_IDS.length}`);
