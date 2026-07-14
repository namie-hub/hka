/* hk_stations.js — Hong Kong Weather Atlas station registry.
 *
 * Loaded via <script> tag so the Atlas works from file:// with no build step.
 *
 * TEMP_STATIONS keys match the `place` names returned by the HKO Open Data
 * API `rhrread` temperature block exactly (English, lang=en).
 *
 * Coordinates are curated to station-level accuracy (~hundreds of metres),
 * good enough for map placement at territory zoom. Roadmap item: replace
 * with the official CSDI automatic-weather-station dataset for surveyed
 * positions. Do not present these as surveyed coordinates.
 */

const HK_TEMP_STATIONS = {
  "King's Park":                 { lat: 22.3119, lon: 114.1728 },
  "Hong Kong Observatory":       { lat: 22.3020, lon: 114.1741 },
  "Wong Chuk Hang":              { lat: 22.2478, lon: 114.1736 },
  "Ta Kwu Ling":                 { lat: 22.5286, lon: 114.1567 },
  "Lau Fau Shan":                { lat: 22.4690, lon: 113.9836 },
  "Tai Po":                      { lat: 22.4462, lon: 114.1787 },
  "Sha Tin":                     { lat: 22.4025, lon: 114.2100 },
  "Tuen Mun":                    { lat: 22.3860, lon: 113.9642 },
  "Tseung Kwan O":               { lat: 22.3158, lon: 114.2555 },
  "Sai Kung":                    { lat: 22.3758, lon: 114.2744 },
  "Cheung Chau":                 { lat: 22.2011, lon: 114.0267 },
  "Chek Lap Kok":                { lat: 22.3094, lon: 113.9219 },
  "Tsing Yi":                    { lat: 22.3441, lon: 114.1100 },
  "Shek Kong":                   { lat: 22.4362, lon: 114.0847 },
  "Tsuen Wan Ho Koon":           { lat: 22.3837, lon: 114.1078 },
  "Tsuen Wan Shing Mun Valley":  { lat: 22.3757, lon: 114.1266 },
  "Hong Kong Park":              { lat: 22.2782, lon: 114.1622 },
  "Shau Kei Wan":                { lat: 22.2782, lon: 114.2361 },
  "Kowloon City":                { lat: 22.3350, lon: 114.1850 },
  "Happy Valley":                { lat: 22.2701, lon: 114.1836 },
  "Wong Tai Sin":                { lat: 22.3358, lon: 114.2047 },
  "Stanley":                     { lat: 22.2142, lon: 114.2144 },
  "Kwun Tong":                   { lat: 22.3125, lon: 114.2231 },
  "Sham Shui Po":                { lat: 22.3358, lon: 114.1369 },
  "Kai Tak Runway Park":         { lat: 22.3047, lon: 114.2136 },
  "Yuen Long Park":              { lat: 22.4408, lon: 114.0172 },
  "Tai Mei Tuk":                 { lat: 22.4752, lon: 114.2375 }
};

/* District centroids for the `rhrread` rainfall block (18 districts).
 * Rainfall is reported per district as a min–max range; a centroid marker
 * is the honest rendering — it locates the district, not a gauge. */
const HK_RAIN_DISTRICTS = {
  "Central & Western District":  { lat: 22.2823, lon: 114.1448 },
  "Eastern District":            { lat: 22.2731, lon: 114.2258 },
  "Kwai Tsing":                  { lat: 22.3561, lon: 114.1120 },
  "Islands District":            { lat: 22.2611, lon: 113.9464 },
  "North District":              { lat: 22.4968, lon: 114.1385 },
  "Sai Kung":                    { lat: 22.3600, lon: 114.2986 },
  "Sha Tin":                     { lat: 22.3877, lon: 114.1953 },
  "Southern District":           { lat: 22.2371, lon: 114.1738 },
  "Tai Po":                      { lat: 22.4501, lon: 114.1688 },
  "Tsuen Wan":                   { lat: 22.3699, lon: 114.1049 },
  "Tuen Mun":                    { lat: 22.3917, lon: 113.9723 },
  "Wan Chai":                    { lat: 22.2755, lon: 114.1817 },
  "Yuen Long":                   { lat: 22.4453, lon: 114.0225 },
  "Yau Tsim Mong":               { lat: 22.3113, lon: 114.1707 },
  "Sham Shui Po":                { lat: 22.3303, lon: 114.1622 },
  "Kowloon City":                { lat: 22.3282, lon: 114.1916 },
  "Wong Tai Sin":                { lat: 22.3420, lon: 114.1953 },
  "Kwun Tong":                   { lat: 22.3133, lon: 114.2258 }
};

/* Tide reference station used by the Atlas (HKO HHOT predictions).
 * QUB = Quarry Bay, the harbour reference gauge. */
const HK_TIDE_STATION = { code: "QUB", name: "Quarry Bay", lat: 22.2911, lon: 114.2133 };

/* Reference point for all distance calculations. */
const HK_REFERENCE = { name: "Hong Kong Observatory", lat: 22.302, lon: 114.174 };
