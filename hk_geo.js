/* hk_geo.js — static geography for the Hong Kong Weather Atlas corridor view.
 * Loaded via <script> tag; no fetches, works from file://.
 */

/* PAGASA Philippine Area of Responsibility boundary (official published
 * vertices). Static geometry — the boundary itself does not change. */
const PAR_BOUNDARY = [
  [25.0, 120.0],
  [25.0, 135.0],
  [5.0, 135.0],
  [5.0, 115.0],
  [15.0, 115.0],
  [21.0, 120.0],
  [25.0, 120.0]
];

/* Distance guide rings centred on Hong Kong, in kilometres.
 * These are DISTANCE GUIDES ONLY — they are not warning thresholds and
 * carry no official meaning. The 800 km ring is the customary distance at
 * which HKO begins issuing TC signal considerations, but issuance depends
 * on wind, not distance; the UI must say so. */
const HK_DISTANCE_RINGS_KM = [200, 400, 800];

/* Corridor default view: Philippine Sea -> Luzon/Taiwan approaches ->
 * South China Sea -> Guangdong coast -> Hong Kong. */
const CORRIDOR_BOUNDS = [
  [4.0, 104.0],   // SW
  [30.0, 145.0]   // NE
];

/* Labels drawn on the corridor map for orientation (sparse on purpose). */
const CORRIDOR_LABELS = [
  { name: "Philippine Sea", lat: 15.5, lon: 132.0 },
  { name: "South China Sea", lat: 15.0, lon: 113.5 },
  { name: "Luzon Strait", lat: 20.6, lon: 121.3 }
];
