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
 * Coordinates are on a 2048x910 SVG canvas matching the map image.
 */
export const TERRITORIES: Territory[] = [
  // --- NORTH AMERICA ---
  { id: "alaska", name: "Alaska", terrain: "land", ipc: 2, originalOwner: "usa",
    x: 358, y: 82, neighbors: ["western_canada", "sz_n_pacific", "sz_arctic"] },
  { id: "greenland", name: "Greenland", terrain: "land", ipc: 0, originalOwner: "uk",
    x: 843, y: 47, neighbors: ["sz_n_atlantic", "sz_arctic", "sz_norwegian"] },
  { id: "western_canada", name: "W. Canada", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 471, y: 130, neighbors: ["alaska", "western_usa", "eastern_canada", "sz_n_pacific"] },
  { id: "eastern_canada", name: "E. Canada", terrain: "land", ipc: 3, originalOwner: "uk",
    x: 616, y: 158, neighbors: ["western_canada", "eastern_usa", "sz_n_atlantic"] },
  { id: "western_usa", name: "W. USA", terrain: "land", ipc: 10, originalOwner: "usa",
    x: 422, y: 216, neighbors: ["western_canada", "central_usa", "mexico", "sz_e_pacific"] },
  { id: "central_usa", name: "C. USA", terrain: "land", ipc: 12, originalOwner: "usa",
    x: 527, y: 224, neighbors: ["western_usa", "eastern_usa", "mexico"] },
  { id: "eastern_usa", name: "E. USA", terrain: "land", ipc: 12, originalOwner: "usa",
    x: 606, y: 226, neighbors: ["central_usa", "eastern_canada", "mexico", "sz_w_atlantic"] },
  { id: "mexico", name: "Mexico", terrain: "land", ipc: 2, originalOwner: "usa",
    x: 465, y: 312, neighbors: ["western_usa", "central_usa", "eastern_usa", "panama", "sz_e_pacific", "sz_caribbean"] },
  { id: "panama", name: "Panama", terrain: "land", ipc: 1, originalOwner: "usa",
    x: 573, y: 393, neighbors: ["mexico", "sz_caribbean", "sz_e_pacific"] },
  { id: "hawaii", name: "Hawaii", terrain: "land", ipc: 1, originalOwner: "usa",
    x: 170, y: 327, neighbors: ["sz_hawaii"] },

  // --- SOUTH AMERICA ---
  { id: "brazil", name: "Brazil", terrain: "land", ipc: 3, originalOwner: "uk",
    x: 717, y: 499, neighbors: ["argentina", "sz_w_atlantic", "sz_s_atlantic"] },
  { id: "argentina", name: "Argentina", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 681, y: 643, neighbors: ["brazil", "sz_s_atlantic"] },

  // --- WESTERN / NORTHERN EUROPE ---
  { id: "united_kingdom", name: "UK", terrain: "land", ipc: 8, originalOwner: "uk",
    x: 979, y: 150, neighbors: ["sz_n_atlantic", "sz_n_sea"] },
  { id: "scandinavia", name: "Scandinavia", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1083, y: 89, neighbors: ["finland", "northern_europe", "sz_n_sea", "sz_baltic", "sz_norwegian"] },
  { id: "finland", name: "Finland", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 1150, y: 85, neighbors: ["scandinavia", "karelia", "sz_baltic"] },
  { id: "northern_europe", name: "N. Europe", terrain: "land", ipc: 4, originalOwner: "germany",
    x: 1032, y: 158, neighbors: ["scandinavia", "germany_terr", "france", "southern_europe", "sz_n_sea"] },
  { id: "france", name: "France", terrain: "land", ipc: 6, originalOwner: "germany",
    x: 991, y: 206, neighbors: ["northern_europe", "southern_europe", "sz_n_atlantic", "sz_med"] },
  { id: "germany_terr", name: "Germany", terrain: "land", ipc: 10, originalOwner: "germany",
    x: 1077, y: 183, neighbors: ["northern_europe", "southern_europe", "poland", "sz_baltic"] },
  { id: "poland", name: "Poland", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1137, y: 146, neighbors: ["germany_terr", "eastern_europe", "karelia", "sz_baltic"] },
  { id: "southern_europe", name: "S. Europe", terrain: "land", ipc: 3, originalOwner: "germany",
    x: 1054, y: 234, neighbors: ["northern_europe", "france", "germany_terr", "eastern_europe", "balkans", "sz_med"] },
  { id: "eastern_europe", name: "E. Europe", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1150, y: 180, neighbors: ["poland", "southern_europe", "balkans", "ukraine"] },
  { id: "balkans", name: "Balkans", terrain: "land", ipc: 2, originalOwner: "germany",
    x: 1122, y: 226, neighbors: ["southern_europe", "eastern_europe", "sz_med", "sz_black_sea"] },

  // --- USSR ---
  { id: "karelia", name: "Karelia", terrain: "land", ipc: 2, originalOwner: "russia",
    x: 1184, y: 97, neighbors: ["finland", "poland", "russia", "archangel", "sz_baltic"] },
  { id: "archangel", name: "Archangel", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1224, y: 85, neighbors: ["karelia", "russia", "evenki", "sz_arctic"] },
  { id: "ukraine", name: "Ukraine", terrain: "land", ipc: 3, originalOwner: "russia",
    x: 1188, y: 193, neighbors: ["eastern_europe", "russia", "caucasus", "sz_black_sea"] },
  { id: "russia", name: "Russia", terrain: "land", ipc: 8, originalOwner: "russia",
    x: 1235, y: 136, neighbors: ["karelia", "archangel", "ukraine", "caucasus", "ural"] },
  { id: "caucasus", name: "Caucasus", terrain: "land", ipc: 4, originalOwner: "russia",
    x: 1273, y: 214, neighbors: ["ukraine", "russia", "persia", "middle_east", "sz_black_sea"] },
  { id: "ural", name: "Urals", terrain: "land", ipc: 2, originalOwner: "russia",
    x: 1304, y: 118, neighbors: ["russia", "novosibirsk", "evenki", "sinkiang"] },
  { id: "evenki", name: "Evenki", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1437, y: 76, neighbors: ["archangel", "ural", "novosibirsk", "yakut", "sz_arctic"] },
  { id: "novosibirsk", name: "Novosibirsk", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1414, y: 135, neighbors: ["ural", "evenki", "yakut", "buryatia", "sinkiang", "mongolia"] },
  { id: "yakut", name: "Yakut", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1589, y: 76, neighbors: ["evenki", "novosibirsk", "buryatia", "soviet_far_east", "sz_arctic"] },
  { id: "buryatia", name: "Buryatia", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1546, y: 150, neighbors: ["novosibirsk", "yakut", "mongolia", "soviet_far_east", "manchuria"] },
  { id: "soviet_far_east", name: "Soviet Far East", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1662, y: 133, neighbors: ["yakut", "buryatia", "manchuria", "sz_sea_japan"] },

  // --- CENTRAL / EAST ASIA ---
  { id: "sinkiang", name: "Sinkiang", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1458, y: 205, neighbors: ["ural", "novosibirsk", "mongolia", "india", "persia", "china"] },
  { id: "mongolia", name: "Mongolia", terrain: "land", ipc: 1, originalOwner: "russia",
    x: 1543, y: 182, neighbors: ["novosibirsk", "buryatia", "sinkiang", "china", "manchuria"] },

  // --- AFRICA / MIDDLE EAST ---
  { id: "egypt", name: "Egypt", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1184, y: 320, neighbors: ["libya", "middle_east", "east_africa", "sz_med", "sz_red"] },
  { id: "libya", name: "Libya", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 1116, y: 290, neighbors: ["egypt", "algeria", "french_west_africa", "sz_med"] },
  { id: "algeria", name: "Algeria", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 1037, y: 271, neighbors: ["libya", "french_west_africa", "sz_med", "sz_n_atlantic"] },
  { id: "french_west_africa", name: "Fr. W. Africa", terrain: "land", ipc: 1, originalOwner: "germany",
    x: 994, y: 347, neighbors: ["algeria", "libya", "west_africa", "sz_n_atlantic", "sz_s_atlantic"] },
  { id: "west_africa", name: "W. Africa", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1022, y: 398, neighbors: ["french_west_africa", "belgian_congo", "sz_s_atlantic"] },
  { id: "belgian_congo", name: "Belgian Congo", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1147, y: 461, neighbors: ["west_africa", "east_africa", "south_africa", "sz_s_atlantic"] },
  { id: "east_africa", name: "E. Africa", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1233, y: 417, neighbors: ["egypt", "belgian_congo", "south_africa", "sz_red", "sz_indian"] },
  { id: "south_africa", name: "S. Africa", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1147, y: 616, neighbors: ["east_africa", "belgian_congo", "sz_s_atlantic", "sz_indian"] },
  { id: "madagascar", name: "Madagascar", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1278, y: 560, neighbors: ["sz_indian"] },

  // --- MIDDLE EAST ---
  { id: "middle_east", name: "Trans-Jordan", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1216, y: 261, neighbors: ["caucasus", "egypt", "persia", "sz_red", "sz_med"] },
  { id: "persia", name: "Persia", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1301, y: 261, neighbors: ["caucasus", "middle_east", "afghanistan", "india", "sinkiang", "sz_red", "sz_arabian"] },
  { id: "afghanistan", name: "Afghanistan", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1369, y: 250, neighbors: ["persia", "india"] },

  // --- SOUTH / SE ASIA ---
  { id: "india", name: "India", terrain: "land", ipc: 3, originalOwner: "uk",
    x: 1446, y: 318, neighbors: ["persia", "afghanistan", "sinkiang", "burma", "sz_arabian", "sz_indian"] },
  { id: "burma", name: "Burma", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1543, y: 325, neighbors: ["india", "china", "siam", "sz_bengal"] },
  { id: "siam", name: "Siam", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 1577, y: 360, neighbors: ["burma", "french_indochina", "malaya", "sz_bengal", "sz_s_china"] },
  { id: "malaya", name: "Malaya", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1587, y: 421, neighbors: ["siam", "east_indies", "sz_bengal", "sz_s_china"] },
  { id: "china", name: "China", terrain: "land", ipc: 4, originalOwner: "japan",
    x: 1570, y: 243, neighbors: ["sinkiang", "mongolia", "manchuria", "burma", "french_indochina"] },
  { id: "manchuria", name: "Manchuria", terrain: "land", ipc: 3, originalOwner: "japan",
    x: 1646, y: 188, neighbors: ["buryatia", "soviet_far_east", "mongolia", "china", "korea", "sz_sea_japan"] },
  { id: "korea", name: "Korea", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 1685, y: 234, neighbors: ["manchuria", "sz_sea_japan"] },
  { id: "japan", name: "Japan", terrain: "land", ipc: 8, originalOwner: "japan",
    x: 1738, y: 239, neighbors: ["sz_sea_japan", "sz_w_pacific", "sz_iwo_jima"] },
  { id: "iwo_jima", name: "Iwo Jima", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 1781, y: 303, neighbors: ["sz_iwo_jima", "sz_w_pacific"] },
  { id: "okinawa", name: "Okinawa", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 1709, y: 294, neighbors: ["sz_iwo_jima", "sz_sea_japan", "sz_philippine"] },
  { id: "french_indochina", name: "Fr. Indochina", terrain: "land", ipc: 2, originalOwner: "japan",
    x: 1602, y: 352, neighbors: ["china", "siam", "sz_s_china"] },
  { id: "philippines", name: "Philippines", terrain: "land", ipc: 3, originalOwner: "japan",
    x: 1693, y: 372, neighbors: ["sz_s_china", "sz_philippine", "sz_w_pacific"] },
  { id: "east_indies", name: "E. Indies", terrain: "land", ipc: 4, originalOwner: "japan",
    x: 1631, y: 456, neighbors: ["malaya", "borneo", "sz_s_china", "sz_indian"] },
  { id: "borneo", name: "Borneo", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 1653, y: 438, neighbors: ["east_indies", "sz_s_china", "sz_philippine", "sz_coral"] },

  // --- OCEANIA ---
  { id: "new_guinea", name: "New Guinea", terrain: "land", ipc: 1, originalOwner: "japan",
    x: 1802, y: 479, neighbors: ["sz_coral", "sz_solomon", "sz_s_china"] },
  { id: "solomon_is", name: "Solomon Is.", terrain: "land", ipc: 0, originalOwner: "uk",
    x: 1906, y: 494, neighbors: ["sz_solomon", "sz_coral"] },
  { id: "caroline_is", name: "Caroline Is.", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 1853, y: 406, neighbors: ["sz_philippine", "sz_w_pacific", "sz_solomon"] },
  { id: "marshall_is", name: "Marshall Is.", terrain: "land", ipc: 0, originalOwner: "japan",
    x: 1969, y: 403, neighbors: ["sz_w_pacific", "sz_hawaii"] },
  { id: "australia", name: "Australia", terrain: "land", ipc: 2, originalOwner: "uk",
    x: 1744, y: 587, neighbors: ["new_zealand", "sz_indian", "sz_coral", "sz_tasman"] },
  { id: "new_zealand", name: "New Zealand", terrain: "land", ipc: 1, originalOwner: "uk",
    x: 1909, y: 681, neighbors: ["australia", "sz_tasman", "sz_s_pacific"] },

  // ================== SEA ZONES ==================
  // North & Arctic
  { id: "sz_arctic", name: "Arctic Sea", terrain: "sea", ipc: 0,
    x: 1024, y: 20, neighbors: ["alaska", "greenland", "archangel", "evenki", "yakut", "sz_n_pacific", "sz_norwegian"] },
  { id: "sz_norwegian", name: "Norwegian Sea", terrain: "sea", ipc: 0,
    x: 1031, y: 67, neighbors: ["scandinavia", "greenland", "sz_arctic", "sz_n_sea", "sz_n_atlantic"] },

  // Pacific
  { id: "sz_n_pacific", name: "N. Pacific", terrain: "sea", ipc: 0,
    x: 1924, y: 188, neighbors: ["alaska", "western_canada", "sz_arctic", "sz_sea_japan", "sz_e_pacific", "sz_hawaii"] },
  { id: "sz_e_pacific", name: "E. Pacific", terrain: "sea", ipc: 0,
    x: 323, y: 303, neighbors: ["western_usa", "mexico", "panama", "sz_n_pacific", "sz_hawaii", "sz_caribbean", "sz_s_pacific"] },
  { id: "sz_hawaii", name: "Hawaiian Sea", terrain: "sea", ipc: 0,
    x: 148, y: 343, neighbors: ["hawaii", "marshall_is", "sz_e_pacific", "sz_n_pacific", "sz_w_pacific", "sz_s_pacific"] },
  { id: "sz_w_pacific", name: "W. Pacific", terrain: "sea", ipc: 0,
    x: 1840, y: 332, neighbors: ["japan", "iwo_jima", "philippines", "caroline_is", "marshall_is", "sz_hawaii", "sz_iwo_jima", "sz_philippine", "sz_sea_japan"] },
  { id: "sz_sea_japan", name: "Sea of Japan", terrain: "sea", ipc: 0,
    x: 1715, y: 216, neighbors: ["japan", "korea", "manchuria", "soviet_far_east", "okinawa", "sz_n_pacific", "sz_w_pacific", "sz_iwo_jima"] },
  { id: "sz_iwo_jima", name: "Iwo Jima Sea", terrain: "sea", ipc: 0,
    x: 1785, y: 292, neighbors: ["iwo_jima", "okinawa", "japan", "sz_w_pacific", "sz_sea_japan", "sz_philippine"] },
  { id: "sz_philippine", name: "Philippine Sea", terrain: "sea", ipc: 0,
    x: 1747, y: 360, neighbors: ["philippines", "okinawa", "borneo", "caroline_is", "sz_iwo_jima", "sz_w_pacific", "sz_s_china", "sz_coral"] },
  { id: "sz_s_china", name: "S. China Sea", terrain: "sea", ipc: 0,
    x: 1655, y: 360, neighbors: ["french_indochina", "siam", "malaya", "philippines", "borneo", "east_indies", "new_guinea", "sz_philippine", "sz_indian", "sz_bengal"] },
  { id: "sz_bengal", name: "Bay of Bengal", terrain: "sea", ipc: 0,
    x: 1508, y: 378, neighbors: ["burma", "siam", "malaya", "sz_s_china", "sz_indian"] },
  { id: "sz_coral", name: "Coral Sea", terrain: "sea", ipc: 0,
    x: 1875, y: 532, neighbors: ["new_guinea", "borneo", "solomon_is", "australia", "sz_philippine", "sz_solomon", "sz_tasman"] },
  { id: "sz_solomon", name: "Solomon Sea", terrain: "sea", ipc: 0,
    x: 1921, y: 474, neighbors: ["solomon_is", "new_guinea", "caroline_is", "sz_coral", "sz_s_pacific"] },
  { id: "sz_tasman", name: "Tasman Sea", terrain: "sea", ipc: 0,
    x: 1843, y: 675, neighbors: ["australia", "new_zealand", "sz_coral", "sz_s_pacific", "sz_indian"] },
  { id: "sz_s_pacific", name: "S. Pacific", terrain: "sea", ipc: 0,
    x: 269, y: 590, neighbors: ["new_zealand", "sz_tasman", "sz_solomon", "sz_hawaii", "sz_e_pacific"] },

  // Indian Ocean / Arabian
  { id: "sz_indian", name: "Indian Ocean", terrain: "sea", ipc: 0,
    x: 1435, y: 532, neighbors: ["india", "east_indies", "australia", "east_africa", "south_africa", "madagascar", "sz_red", "sz_arabian", "sz_s_china", "sz_tasman", "sz_bengal", "sz_s_atlantic"] },
  { id: "sz_arabian", name: "Arabian Sea", terrain: "sea", ipc: 0,
    x: 1364, y: 360, neighbors: ["persia", "india", "sz_red", "sz_indian"] },
  { id: "sz_red", name: "Red Sea", terrain: "sea", ipc: 0,
    x: 1230, y: 332, neighbors: ["egypt", "middle_east", "persia", "east_africa", "sz_arabian", "sz_indian", "sz_med"] },

  // Mediterranean & Black Sea
  { id: "sz_med", name: "Mediterranean", terrain: "sea", ipc: 0,
    x: 1105, y: 256, neighbors: ["france", "southern_europe", "balkans", "algeria", "libya", "egypt", "middle_east", "sz_red", "sz_n_atlantic", "sz_black_sea"] },
  { id: "sz_black_sea", name: "Black Sea", terrain: "sea", ipc: 0,
    x: 1207, y: 211, neighbors: ["balkans", "ukraine", "caucasus", "sz_med"] },

  // North Sea / Baltic
  { id: "sz_baltic", name: "Baltic Sea", terrain: "sea", ipc: 0,
    x: 1124, y: 117, neighbors: ["scandinavia", "finland", "germany_terr", "poland", "karelia", "sz_n_sea"] },
  { id: "sz_n_sea", name: "North Sea", terrain: "sea", ipc: 0,
    x: 1015, y: 125, neighbors: ["united_kingdom", "scandinavia", "northern_europe", "sz_baltic", "sz_norwegian", "sz_n_atlantic"] },

  // Atlantic
  { id: "sz_n_atlantic", name: "N. Atlantic", terrain: "sea", ipc: 0,
    x: 849, y: 173, neighbors: ["eastern_canada", "united_kingdom", "france", "greenland", "algeria", "french_west_africa", "sz_norwegian", "sz_n_sea", "sz_w_atlantic", "sz_med"] },
  { id: "sz_w_atlantic", name: "W. Atlantic", terrain: "sea", ipc: 0,
    x: 730, y: 273, neighbors: ["eastern_usa", "brazil", "sz_n_atlantic", "sz_caribbean", "sz_s_atlantic"] },
  { id: "sz_caribbean", name: "Caribbean", terrain: "sea", ipc: 0,
    x: 610, y: 360, neighbors: ["mexico", "panama", "sz_w_atlantic", "sz_e_pacific"] },
  { id: "sz_s_atlantic", name: "S. Atlantic", terrain: "sea", ipc: 0,
    x: 915, y: 590, neighbors: ["brazil", "argentina", "french_west_africa", "west_africa", "belgian_congo", "south_africa", "sz_w_atlantic", "sz_indian"] },
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
