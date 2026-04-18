import type { Power, Territory, UnitId, PowerId } from "./types.js";

/**
 * POWERS — 1942 2nd Edition turn order.
 */
export const POWERS: Record<PowerId, Power> = {
  russia: {
    id: "russia", name: "Russia", alliance: "allies",
    color: "#a33032", accent: "#6e1d1e",
    capital: "russia", turnOrder: 1,
  },
  germany: {
    id: "germany", name: "Germany", alliance: "axis",
    color: "#6a6a6a", accent: "#3a3a3a",
    capital: "germany_terr", turnOrder: 2,
  },
  uk: {
    id: "uk", name: "United Kingdom", alliance: "allies",
    color: "#c6a24f", accent: "#7c6327",
    capital: "united_kingdom", turnOrder: 3,
  },
  japan: {
    id: "japan", name: "Japan", alliance: "axis",
    color: "#e39a46", accent: "#8a5618",
    capital: "japan", turnOrder: 4,
  },
  usa: {
    id: "usa", name: "United States", alliance: "allies",
    color: "#3e7a5c", accent: "#1f3d2e",
    capital: "eastern_usa", turnOrder: 5,
  },
};

export const POWER_ORDER: PowerId[] = ["russia", "germany", "uk", "japan", "usa"];

/**
 * TERRITORIES — 1942 world map.
 * Coordinates are on a 2400x1200 SVG canvas.
 */
export const TERRITORIES: Territory[] = [
  // --- NORTH AMERICA ---
  { id: "alaska", name: "Alaska", terrain: "land", ipc: 2, originalOwner: "usa",
    x: 425, y: 116, neighbors: ["western_canada", "sz_n_pacific", "sz_arctic"] },
  { id: "greenland", name: "Greenland", terrain: "land", ipc: 0, originalOwner: "uk",
    x: 1008, y: 64, neighbors: ["sz_n_atlantic", "sz_arctic", "sz_norwegian"] },
  { id: "western_canada", name: "Western Canada", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 565, y: 178, neighbors: ["alaska", "western_usa", "eastern_canada", "sz_n_pacific"] },
  { id: "eastern_canada", name: "Eastern Canada", terrain: "land", ipc: 3, originalOwner: "uk",
    x: 744, y: 214, neighbors: ["western_canada", "eastern_usa", "sz_n_atlantic"] },
  { id: "western_usa", name: "Western USA", terrain: "land", ipc: 10, originalOwner: "usa",
    x: 509, y: 288, neighbors: ["western_canada", "central_usa", "mexico", "sz_e_pacific"] },
  { id: "central_usa", name: "Central USA", terrain: "land", ipc: 12, originalOwner: "usa",
    x: 629, y: 288, neighbors: ["western_usa", "eastern_usa", "mexico"] },
  { id: "eastern_usa", name: "Eastern USA", terrain: "land", ipc: 12, originalOwner: "usa",
    x: 715, y: 303, neighbors: ["central_usa", "eastern_canada", "mexico", "sz_w_atlantic"] },
  { id: "mexico", name: "Mexico", terrain: "land", ipc: 2, originalOwner: "usa",
    x: 552, y: 417, neighbors: ["western_usa", "central_usa", "eastern_usa", "panama", "sz_e_pacific", "sz_caribbean"] },
  { id: "panama", name: "Panama", terrain: "land", ipc: 1, originalOwner: "usa",
    x: 681, y: 523, neighbors: ["mexico", "sz_caribbean", "sz_e_pacific"] },
  { id: "hawaii", name: "Hawaii", terrain: "land", ipc: 1, originalOwner: "usa",
    x: 199, y: 432, neighbors: ["sz_hawaii"] },

  // --- SOUTH AMERICA ---
  { id: "brazil", name: "Brazil", terrain: "land", ipc: 3, originalOwner: "uk",
    x: 844, y: 666, neighbors: ["argentina", "sz_w_atlantic", "sz_s_atlantic"] },
  { id: "argentina", name: "Argentina", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 802, y: 855, neighbors: ["brazil", "sz_s_atlantic"] },

  // --- WESTERN / NORTHERN EUROPE ---
  { id: "united_kingdom", name: "United Kingdom", terrain: "land", ipc: 8, originalOwner: "uk",
    x: 1189, y: 185, neighbors: ["sz_n_atlantic", "sz_n_sea"] },
  { id: "scandinavia", name: "Scandinavia", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1279, y: 130, neighbors: ["finland", "northern_europe", "sz_n_sea", "sz_baltic", "sz_norwegian"] },
  { id: "finland", name: "Finland", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 1334, y: 116, neighbors: ["scandinavia", "karelia", "sz_baltic"] },
  { id: "northern_europe", name: "Northern Europe", terrain: "land", ipc: 4, originalOwner: "germany",
    x: 1251, y: 200, neighbors: ["scandinavia", "germany_terr", "france", "southern_europe", "sz_n_sea"] },
  { id: "france", name: "France", terrain: "land", ipc: 6, originalOwner: "germany",
    x: 1212, y: 243, neighbors: ["northern_europe", "southern_europe", "sz_n_atlantic", "sz_med"] },
  { id: "germany_terr", name: "Germany", terrain: "land", ipc: 10, originalOwner: "germany",
    x: 1257, y: 207, neighbors: ["northern_europe", "southern_europe", "poland", "sz_baltic"] },
  { id: "poland", name: "Poland / Baltic States", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1313, y: 200, neighbors: ["germany_terr", "eastern_europe", "karelia", "sz_baltic"] },
  { id: "southern_europe", name: "Southern Europe", terrain: "land", ipc: 3, originalOwner: "germany",
    x: 1271, y: 273, neighbors: ["northern_europe", "france", "germany_terr", "eastern_europe", "balkans", "sz_med"] },
  { id: "eastern_europe", name: "Eastern Europe", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1344, y: 229, neighbors: ["poland", "southern_europe", "balkans", "ukraine"] },
  { id: "balkans", name: "Balkans", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1324, y: 266, neighbors: ["southern_europe", "eastern_europe", "sz_med", "sz_black_sea"] },

  // --- USSR ---
  { id: "karelia", name: "Karelia S.S.R.", terrain: "land", ipc: 2, originalOwner: "russia",
    x: 1367, y: 123, neighbors: ["finland", "poland", "russia", "archangel", "sz_baltic"] },
  { id: "archangel", name: "Archangel", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1412, y: 116, neighbors: ["karelia", "russia", "evenki", "sz_arctic"] },
  { id: "ukraine", name: "Ukraine S.S.R.", terrain: "land", ipc: 3, originalOwner: "russia",
    x: 1378, y: 221, neighbors: ["eastern_europe", "russia", "caucasus", "sz_black_sea"] },
  { id: "russia", name: "Russia (Moscow)", terrain: "land", ipc: 8, originalOwner: "russia",
    x: 1407, y: 173, neighbors: ["karelia", "archangel", "ukraine", "caucasus", "ural"] },
  { id: "caucasus", name: "Caucasus", terrain: "land", ipc: 4, originalOwner: "russia",
    x: 1468, y: 273, neighbors: ["ukraine", "russia", "persia", "middle_east", "sz_black_sea"] },
  { id: "ural", name: "Urals", terrain: "land", ipc: 2, originalOwner: "russia",
    x: 1525, y: 157, neighbors: ["russia", "novosibirsk", "evenki", "sinkiang"] },
  { id: "evenki", name: "Evenki National Okrug", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1683, y: 103, neighbors: ["archangel", "ural", "novosibirsk", "yakut", "sz_arctic"] },
  { id: "novosibirsk", name: "Novosibirsk", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1659, y: 178, neighbors: ["ural", "evenki", "yakut", "buryatia", "sinkiang", "mongolia"] },
  { id: "yakut", name: "Yakut S.S.R.", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1860, y: 103, neighbors: ["evenki", "novosibirsk", "buryatia", "soviet_far_east", "sz_arctic"] },
  { id: "buryatia", name: "Buryatia S.S.R.", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1809, y: 200, neighbors: ["novosibirsk", "yakut", "mongolia", "soviet_far_east", "manchuria"] },
  { id: "soviet_far_east", name: "Soviet Far East", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1946, y: 178, neighbors: ["yakut", "buryatia", "manchuria", "sz_sea_japan"] },

  // --- CENTRAL / EAST ASIA (neutral/contested) ---
  { id: "sinkiang", name: "Sinkiang", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1706, y: 273, neighbors: ["ural", "novosibirsk", "mongolia", "india", "persia", "china"] },
  { id: "mongolia", name: "Mongolia", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1807, y: 243, neighbors: ["novosibirsk", "buryatia", "sinkiang", "china", "manchuria"] },

  // --- AFRICA / MIDDLE EAST ---
  { id: "egypt", name: "Anglo-Egypt Sudan", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1391, y: 425, neighbors: ["libya", "middle_east", "east_africa", "sz_med", "sz_red"] },
  { id: "libya", name: "Libya", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 1313, y: 387, neighbors: ["egypt", "algeria", "french_west_africa", "sz_med"] },
  { id: "algeria", name: "Algeria / Morocco", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 1219, y: 364, neighbors: ["libya", "french_west_africa", "sz_med", "sz_n_atlantic"] },
  { id: "french_west_africa", name: "French West Africa", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 1168, y: 462, neighbors: ["algeria", "libya", "west_africa", "sz_n_atlantic", "sz_s_atlantic"] },
  { id: "west_africa", name: "West Africa", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1200, y: 530, neighbors: ["french_west_africa", "belgian_congo", "sz_s_atlantic"] },
  { id: "belgian_congo", name: "Belgian Congo", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1350, y: 613, neighbors: ["west_africa", "east_africa", "south_africa", "sz_s_atlantic"] },
  { id: "east_africa", name: "East Africa", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1447, y: 553, neighbors: ["egypt", "belgian_congo", "south_africa", "sz_red", "sz_indian"] },
  { id: "south_africa", name: "South Africa", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1350, y: 817, neighbors: ["east_africa", "belgian_congo", "sz_s_atlantic", "sz_indian"] },
  { id: "madagascar", name: "Madagascar", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1500, y: 742, neighbors: ["sz_indian"] },

  // --- MIDDLE EAST ---
  { id: "middle_east", name: "Trans-Jordan", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1429, y: 349, neighbors: ["caucasus", "egypt", "persia", "sz_red", "sz_med"] },
  { id: "persia", name: "Persia", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1528, y: 349, neighbors: ["caucasus", "middle_east", "afghanistan", "india", "sinkiang", "sz_red", "sz_arabian"] },
  { id: "afghanistan", name: "Afghanistan", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1606, y: 334, neighbors: ["persia", "india"] },

  // --- SOUTH / SE ASIA ---
  { id: "india", name: "India", terrain: "land", ipc: 3, originalOwner: "uk",
    x: 1696, y: 425, neighbors: ["persia", "afghanistan", "sinkiang", "burma", "sz_arabian", "sz_indian"] },
  { id: "burma", name: "Burma", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1812, y: 432, neighbors: ["india", "china", "siam", "sz_bengal"] },
  { id: "siam", name: "Siam", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 1851, y: 478, neighbors: ["burma", "french_indochina", "malaya", "sz_bengal", "sz_s_china"] },
  { id: "malaya", name: "Malaya", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1864, y: 561, neighbors: ["siam", "east_indies", "sz_bengal", "sz_s_china"] },
  { id: "china", name: "China", terrain: "land", ipc: 4, originalOwner: "japan",
    x: 1843, y: 326, neighbors: ["sinkiang", "mongolia", "manchuria", "burma", "french_indochina"] },
  { id: "manchuria", name: "Manchuria", terrain: "land", ipc: 3, originalOwner: "japan",
    x: 1933, y: 251, neighbors: ["buryatia", "soviet_far_east", "mongolia", "china", "korea", "sz_sea_japan"] },
  { id: "korea", name: "Korea", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 1978, y: 311, neighbors: ["manchuria", "sz_sea_japan"] },
  { id: "japan", name: "Japan", terrain: "land", ipc: 8, originalOwner: "japan",
    x: 2042, y: 318, neighbors: ["sz_sea_japan", "sz_w_pacific", "sz_iwo_jima"] },
  { id: "iwo_jima", name: "Iwo Jima", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 2091, y: 404, neighbors: ["sz_iwo_jima", "sz_w_pacific"] },
  { id: "okinawa", name: "Okinawa", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 2006, y: 391, neighbors: ["sz_iwo_jima", "sz_sea_japan", "sz_philippine"] },
  { id: "french_indochina", name: "French Indochina", terrain: "land", ipc: 2, originalOwner: "japan",
    x: 1882, y: 470, neighbors: ["china", "siam", "sz_s_china"] },
  { id: "philippines", name: "Philippines", terrain: "land", ipc: 3, originalOwner: "japan",
    x: 1988, y: 493, neighbors: ["sz_s_china", "sz_philippine", "sz_w_pacific"] },
  { id: "east_indies", name: "East Indies", terrain: "land", ipc: 4, originalOwner: "japan",
    x: 1916, y: 606, neighbors: ["malaya", "borneo", "sz_s_china", "sz_indian"] },
  { id: "borneo", name: "Borneo", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 1942, y: 583, neighbors: ["east_indies", "sz_s_china", "sz_philippine", "sz_coral"] },

  // --- OCEANIA ---
  { id: "new_guinea", name: "New Guinea", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 2116, y: 636, neighbors: ["sz_coral", "sz_solomon", "sz_s_china"] },
  { id: "solomon_is", name: "Solomon Islands", terrain: "land", ipc: 0, originalOwner: "uk",
    x: 2238, y: 658, neighbors: ["sz_solomon", "sz_coral"] },
  { id: "caroline_is", name: "Caroline Islands", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 2174, y: 538, neighbors: ["sz_philippine", "sz_w_pacific", "sz_solomon"] },
  { id: "marshall_is", name: "Marshall Islands", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 2311, y: 538, neighbors: ["sz_w_pacific", "sz_hawaii"] },
  { id: "australia", name: "Australia", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 2047, y: 779, neighbors: ["new_zealand", "sz_indian", "sz_coral", "sz_tasman"] },
  { id: "new_zealand", name: "New Zealand", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 2240, y: 901, neighbors: ["australia", "sz_tasman", "sz_s_pacific"] },

  // ================== SEA ZONES ==================
  // North & Arctic
  { id: "sz_arctic", name: "Arctic Sea", terrain: "sea", ipc: 0,
    x: 1200, y: 8, neighbors: ["alaska", "greenland", "archangel", "evenki", "yakut", "sz_n_pacific", "sz_norwegian"] },
  { id: "sz_norwegian", name: "Norwegian Sea", terrain: "sea", ipc: 0,
    x: 1215, y: 90, neighbors: ["scandinavia", "greenland", "sz_arctic", "sz_n_sea", "sz_n_atlantic"] },

  // Pacific
  { id: "sz_n_pacific", name: "North Pacific", terrain: "sea", ipc: 0,
    x: 2256, y: 251, neighbors: ["alaska", "western_canada", "sz_arctic", "sz_sea_japan", "sz_e_pacific", "sz_hawaii"] },
  { id: "sz_e_pacific", name: "East Pacific", terrain: "sea", ipc: 0,
    x: 379, y: 402, neighbors: ["western_usa", "mexico", "panama", "sz_n_pacific", "sz_hawaii", "sz_caribbean", "sz_s_pacific"] },
  { id: "sz_hawaii", name: "Hawaiian Sea", terrain: "sea", ipc: 0,
    x: 174, y: 455, neighbors: ["hawaii", "marshall_is", "sz_e_pacific", "sz_n_pacific", "sz_w_pacific", "sz_s_pacific"] },
  { id: "sz_w_pacific", name: "West Pacific", terrain: "sea", ipc: 0,
    x: 2158, y: 440, neighbors: ["japan", "iwo_jima", "philippines", "caroline_is", "marshall_is", "sz_hawaii", "sz_iwo_jima", "sz_philippine", "sz_sea_japan"] },
  { id: "sz_sea_japan", name: "Sea of Japan", terrain: "sea", ipc: 0,
    x: 2011, y: 288, neighbors: ["japan", "korea", "manchuria", "soviet_far_east", "okinawa", "sz_n_pacific", "sz_w_pacific", "sz_iwo_jima"] },
  { id: "sz_iwo_jima", name: "Iwo Jima Sea", terrain: "sea", ipc: 0,
    x: 2093, y: 387, neighbors: ["iwo_jima", "okinawa", "japan", "sz_w_pacific", "sz_sea_japan", "sz_philippine"] },
  { id: "sz_philippine", name: "Philippine Sea", terrain: "sea", ipc: 0,
    x: 2050, y: 478, neighbors: ["philippines", "okinawa", "borneo", "caroline_is", "sz_iwo_jima", "sz_w_pacific", "sz_s_china", "sz_coral"] },
  { id: "sz_s_china", name: "South China Sea", terrain: "sea", ipc: 0,
    x: 1941, y: 478, neighbors: ["french_indochina", "siam", "malaya", "philippines", "borneo", "east_indies", "new_guinea", "sz_philippine", "sz_indian", "sz_bengal"] },
  { id: "sz_bengal", name: "Bay of Bengal", terrain: "sea", ipc: 0,
    x: 1769, y: 500, neighbors: ["burma", "siam", "malaya", "sz_s_china", "sz_indian"] },
  { id: "sz_coral", name: "Coral Sea", terrain: "sea", ipc: 0,
    x: 2199, y: 704, neighbors: ["new_guinea", "borneo", "solomon_is", "australia", "sz_philippine", "sz_solomon", "sz_tasman"] },
  { id: "sz_solomon", name: "Solomon Sea", terrain: "sea", ipc: 0,
    x: 2253, y: 628, neighbors: ["solomon_is", "new_guinea", "caroline_is", "sz_coral", "sz_s_pacific"] },
  { id: "sz_tasman", name: "Tasman Sea", terrain: "sea", ipc: 0,
    x: 2161, y: 893, neighbors: ["australia", "new_zealand", "sz_coral", "sz_s_pacific", "sz_indian"] },
  { id: "sz_s_pacific", name: "South Pacific", terrain: "sea", ipc: 0,
    x: 315, y: 779, neighbors: ["new_zealand", "sz_tasman", "sz_solomon", "sz_hawaii", "sz_e_pacific"] },

  // Indian Ocean / Arabian
  { id: "sz_indian", name: "Indian Ocean", terrain: "sea", ipc: 0,
    x: 1683, y: 704, neighbors: ["india", "east_indies", "australia", "east_africa", "south_africa", "madagascar", "sz_red", "sz_arabian", "sz_s_china", "sz_tasman", "sz_bengal", "sz_s_atlantic"] },
  { id: "sz_arabian", name: "Arabian Sea", terrain: "sea", ipc: 0,
    x: 1599, y: 478, neighbors: ["persia", "india", "sz_red", "sz_indian"] },
  { id: "sz_red", name: "Red Sea", terrain: "sea", ipc: 0,
    x: 1443, y: 440, neighbors: ["egypt", "middle_east", "persia", "east_africa", "sz_arabian", "sz_indian", "sz_med"] },

  // Mediterranean & Black Sea
  { id: "sz_med", name: "Mediterranean", terrain: "sea", ipc: 0,
    x: 1310, y: 318, neighbors: ["france", "southern_europe", "balkans", "algeria", "libya", "egypt", "middle_east", "sz_red", "sz_n_atlantic", "sz_black_sea"] },
  { id: "sz_black_sea", name: "Black Sea", terrain: "sea", ipc: 0,
    x: 1407, y: 266, neighbors: ["balkans", "ukraine", "caucasus", "sz_med"] },

  // North Sea / Baltic
  { id: "sz_baltic", name: "Baltic Sea", terrain: "sea", ipc: 0,
    x: 1303, y: 157, neighbors: ["scandinavia", "finland", "germany_terr", "poland", "karelia", "sz_n_sea"] },
  { id: "sz_n_sea", name: "North Sea", terrain: "sea", ipc: 0,
    x: 1222, y: 171, neighbors: ["united_kingdom", "scandinavia", "northern_europe", "sz_baltic", "sz_norwegian", "sz_n_atlantic"] },

  // Atlantic
  { id: "sz_n_atlantic", name: "North Atlantic", terrain: "sea", ipc: 0,
    x: 998, y: 229, neighbors: ["eastern_canada", "united_kingdom", "france", "greenland", "algeria", "french_west_africa", "sz_norwegian", "sz_n_sea", "sz_w_atlantic", "sz_med"] },
  { id: "sz_w_atlantic", name: "West Atlantic", terrain: "sea", ipc: 0,
    x: 857, y: 364, neighbors: ["eastern_usa", "brazil", "sz_n_atlantic", "sz_caribbean", "sz_s_atlantic"] },
  { id: "sz_caribbean", name: "Caribbean Sea", terrain: "sea", ipc: 0,
    x: 717, y: 478, neighbors: ["mexico", "panama", "sz_w_atlantic", "sz_e_pacific"] },
  { id: "sz_s_atlantic", name: "South Atlantic", terrain: "sea", ipc: 0,
    x: 1074, y: 779, neighbors: ["brazil", "argentina", "french_west_africa", "west_africa", "belgian_congo", "south_africa", "sz_w_atlantic", "sz_indian"] },
];

export const TERRITORY_MAP: Record<string, Territory> =
  Object.fromEntries(TERRITORIES.map((t) => [t.id, t]));

/**
 * STARTING SETUP — each entry: {territory, units: {unit: qty}} for the owner.
 * Greatly simplified from the official 1942 2E setup but preserves flavor & balance.
 */
export interface StartingUnit {
  territory: string;
  owner: PowerId;
  units: Partial<Record<UnitId, number>>;
}

export const STARTING_SETUP: StartingUnit[] = [
  // RUSSIA
  { territory: "russia", owner: "russia", units: { infantry: 4, artillery: 1, tank: 2, fighter: 1, factory: 1 } },
  { territory: "karelia", owner: "russia", units: { infantry: 3, aa: 1 } },
  { territory: "caucasus", owner: "russia", units: { infantry: 3, tank: 1, factory: 1 } },
  { territory: "ukraine", owner: "russia", units: { infantry: 2 } },
  { territory: "archangel", owner: "russia", units: { infantry: 1 } },
  { territory: "ural", owner: "russia", units: { infantry: 2 } },
  { territory: "evenki", owner: "russia", units: { infantry: 1 } },
  { territory: "novosibirsk", owner: "russia", units: { infantry: 1 } },
  { territory: "buryatia", owner: "russia", units: { infantry: 1 } },
  { territory: "yakut", owner: "russia", units: { infantry: 1 } },
  { territory: "soviet_far_east", owner: "russia", units: { infantry: 1 } },
  { territory: "sinkiang", owner: "russia", units: { infantry: 1 } },
  { territory: "mongolia", owner: "russia", units: { infantry: 1 } },

  // GERMANY
  { territory: "germany_terr", owner: "germany", units: { infantry: 4, artillery: 1, tank: 2, fighter: 2, bomber: 1, aa: 1, factory: 1 } },
  { territory: "northern_europe", owner: "germany", units: { infantry: 2, artillery: 1, tank: 1 } },
  { territory: "france", owner: "germany", units: { infantry: 2, tank: 1 } },
  { territory: "southern_europe", owner: "germany", units: { infantry: 2, fighter: 1 } },
  { territory: "eastern_europe", owner: "germany", units: { infantry: 2 } },
  { territory: "poland", owner: "germany", units: { infantry: 2 } },
  { territory: "balkans", owner: "germany", units: { infantry: 1 } },
  { territory: "scandinavia", owner: "germany", units: { infantry: 1 } },
  { territory: "finland", owner: "germany", units: { infantry: 1 } },
  { territory: "libya", owner: "germany", units: { infantry: 1, tank: 1 } },
  { territory: "algeria", owner: "germany", units: { infantry: 1 } },
  { territory: "french_west_africa", owner: "germany", units: { infantry: 1 } },
  { territory: "sz_baltic", owner: "germany", units: { submarine: 1, transport: 1 } },
  { territory: "sz_med", owner: "germany", units: { cruiser: 1, transport: 1 } },

  // UK
  { territory: "united_kingdom", owner: "uk", units: { infantry: 3, artillery: 1, fighter: 2, bomber: 1, aa: 1, factory: 1 } },
  { territory: "eastern_canada", owner: "uk", units: { infantry: 1 } },
  { territory: "greenland", owner: "uk", units: { infantry: 1 } },
  { territory: "india", owner: "uk", units: { infantry: 2, artillery: 1, fighter: 1, factory: 1 } },
  { territory: "burma", owner: "uk", units: { infantry: 1 } },
  { territory: "malaya", owner: "uk", units: { infantry: 1 } },
  { territory: "egypt", owner: "uk", units: { infantry: 1, tank: 1 } },
  { territory: "middle_east", owner: "uk", units: { infantry: 1 } },
  { territory: "persia", owner: "uk", units: { infantry: 1 } },
  { territory: "afghanistan", owner: "uk", units: { infantry: 1 } },
  { territory: "east_africa", owner: "uk", units: { infantry: 1 } },
  { territory: "belgian_congo", owner: "uk", units: { infantry: 1 } },
  { territory: "south_africa", owner: "uk", units: { infantry: 1 } },
  { territory: "west_africa", owner: "uk", units: { infantry: 1 } },
  { territory: "madagascar", owner: "uk", units: { infantry: 1 } },
  { territory: "australia", owner: "uk", units: { infantry: 1, fighter: 1 } },
  { territory: "new_zealand", owner: "uk", units: { infantry: 1 } },
  { territory: "solomon_is", owner: "uk", units: { infantry: 1 } },
  { territory: "brazil", owner: "uk", units: { infantry: 1 } },
  { territory: "argentina", owner: "uk", units: { infantry: 1 } },
  { territory: "sz_n_sea", owner: "uk", units: { battleship: 1, destroyer: 1, transport: 1 } },
  { territory: "sz_n_atlantic", owner: "uk", units: { cruiser: 1 } },
  { territory: "sz_indian", owner: "uk", units: { destroyer: 1, transport: 1 } },

  // JAPAN
  { territory: "japan", owner: "japan", units: { infantry: 3, artillery: 1, fighter: 2, aa: 1, factory: 1 } },
  { territory: "manchuria", owner: "japan", units: { infantry: 3, artillery: 1 } },
  { territory: "china", owner: "japan", units: { infantry: 2 } },
  { territory: "korea", owner: "japan", units: { infantry: 1 } },
  { territory: "french_indochina", owner: "japan", units: { infantry: 2, tank: 1 } },
  { territory: "siam", owner: "japan", units: { infantry: 1 } },
  { territory: "philippines", owner: "japan", units: { infantry: 1 } },
  { territory: "east_indies", owner: "japan", units: { infantry: 1 } },
  { territory: "borneo", owner: "japan", units: { infantry: 1 } },
  { territory: "new_guinea", owner: "japan", units: { infantry: 1 } },
  { territory: "iwo_jima", owner: "japan", units: { infantry: 1 } },
  { territory: "okinawa", owner: "japan", units: { infantry: 1 } },
  { territory: "caroline_is", owner: "japan", units: { infantry: 1 } },
  { territory: "marshall_is", owner: "japan", units: { infantry: 1 } },
  { territory: "sz_sea_japan", owner: "japan", units: { battleship: 1, carrier: 1, fighter: 1, destroyer: 1, submarine: 1, transport: 1 } },
  { territory: "sz_w_pacific", owner: "japan", units: { cruiser: 1, transport: 1 } },

  // USA
  { territory: "eastern_usa", owner: "usa", units: { infantry: 3, artillery: 1, tank: 1, fighter: 1, bomber: 1, aa: 1, factory: 1 } },
  { territory: "central_usa", owner: "usa", units: { infantry: 1 } },
  { territory: "western_usa", owner: "usa", units: { infantry: 2, tank: 1, fighter: 1, factory: 1 } },
  { territory: "alaska", owner: "usa", units: { infantry: 1 } },
  { territory: "hawaii", owner: "usa", units: { infantry: 1 } },
  { territory: "mexico", owner: "usa", units: { infantry: 1 } },
  { territory: "panama", owner: "usa", units: { infantry: 1 } },
  { territory: "sz_w_atlantic", owner: "usa", units: { battleship: 1, cruiser: 1, destroyer: 1, transport: 1 } },
  { territory: "sz_hawaii", owner: "usa", units: { carrier: 1, fighter: 1, destroyer: 1, submarine: 1, transport: 1 } },
];
