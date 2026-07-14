# Hong Kong Weather Atlas

A regional tropical-weather atlas centred on Hong Kong: everyday HKO-depth weather when
zoomed in, and the full storm corridor — Philippine Sea → Luzon/Taiwan approaches →
South China Sea → Hong Kong — when zoomed out.

**No backend, no build step, no API key, no tracking.** Two HTML files that run from a
local `file://` open or any static host (GitHub Pages).

## Why this exists

The Hong Kong Observatory is the sole warning authority for Hong Kong and its data is
good — but its public interface carries trackers, and its view begins near Hong Kong.
This Atlas fetches the same official open data directly, adds the regional view (JMA
tracks systems as tropical depressions, days before a local signal is conceivable), and
places official forecasts beside model output without pretending either is infallible.
HKO is authoritative; authority is not the same as verification. **The only truth is
what verifies afterwards** — a hindsight scoring view is the roadmap's end state.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Weather Atlas: temperature stations, district rainfall, radar, warnings, local + 9-day forecast, tides, model board. |
| `hk_storm_corridor.html` | Storm corridor: JMA cyclone tracks and probability circles, Himawari infrared, PAR boundary, HK distance rings, "what changed" briefing. |
| `hk_stations.js` | HKO station and district registry (names match the `rhrread` feed exactly). Loaded via `<script>` tag. |
| `hk_geo.js` | Static geography: PAR boundary, corridor bounds, distance-ring configuration. |
| `hk_pressure.js` | Sea-level-pressure engine (ported from the Japan Atlas): model fetch, marching-squares isobars, L/H centres, experimental "L?" forming-low detection. |
| `hk_aqhi.js` | GENERATED hourly by Actions — EPD AQHI per station. EPD's feed is CORS-locked, so this is the only static-compatible route. |
| `vendor/leaflet/` | Leaflet 1.9.4 bundled locally: one less third party, and a CDN outage can no longer take down the whole page. |
| `scripts/ingest_aqhi.py` | AQHI ingest; fails loudly if the EPD format changes. |
| `scripts/check_feeds.js` | Feed health check with retries and payload-shape validation. |
| `.github/workflows/feed-check.yml` | Runs the health check daily at 06:45 HKT; a failure email is the alert. |
| `.github/workflows/update-aqhi.yml` | Hourly AQHI ingest at :42, commit-only-on-change (generatedAt excluded from the diff). |

All files must sit in the same folder. Double-click `index.html` — that's the whole
install.

## Privacy

The Atlas contacts **only data endpoints** and nothing else:

- `data.weather.gov.hk` — HKO Open Data API (official, documented)
- `www.jma.go.jp` — JMA typhoon feed and Himawari satellite tiles
- `api.open-meteo.com` — multi-model point forecasts
- `api.rainviewer.com` / `tilecache.rainviewer.com` — third-party radar composite
- `tile.openstreetmap.org` — basemap tiles
- `www.hko.gov.hk` — official HKO radar imagery (plain images, shown as published)
- `www.aqhi.gov.hk` — contacted only by GitHub Actions, never by your browser

No analytics, no cookies, no fingerprinting, no font CDN (system fonts are a privacy
choice, not an oversight), and no JS CDN either — Leaflet is bundled in `vendor/`. The "What changed since you last looked" briefing is computed
in localStorage and never leaves the device. Any tile or API server necessarily sees
your IP address, like any web request; that is the complete exposure. If you want zero
third parties, vendor Leaflet locally and self-host tiles — both are drop-in changes.

## Data honesty rules (carried over from the Japan Atlas)

- Every source shows **status (live / stale / unavailable), fetch time, and publication
  time** separately — one timestamp for multi-source data is a lie of averaging.
- A feed failure is rendered as a feed failure, **never** as "no warnings" or "no storms".
  An empty JMA system list from a live feed is explicitly labelled as a real answer.
- Provenance tags on every card: **Observed / Official / Model·Experimental / Third-party.**
  Experimental content never borrows official warning colours.
- District rainfall markers are labelled as district centroids showing HKO's min–max
  range — they locate districts, not rain gauges.
- Distance rings are guides; the UI says signals depend on wind, not distance.
  Probability circles are position uncertainty, not storm size — the popup says so.
- Tide curves are astronomical predictions and are labelled as **not** surge forecasts.

## Known limits (by design or by upstream)

- **Station coordinates are curated**, accurate to roughly the station's block, pending
  ingestion of the official CSDI automatic-weather-station dataset (roadmap).
- **No live wind view.** HKO's 10-minute wind is published as CSV without CORS headers,
  so a static page cannot fetch it live. Showing GitHub-Actions-aged copies of 10-minute
  data would be dishonestly stale, so it is omitted rather than faked.
- **PAGASA has no machine-readable feed.** The PAR boundary is drawn (static geometry)
  and the panel links out; live bulletin status awaits an Actions-based ingest.
- **RainViewer is a third-party composite**, not HKO radar, and is labelled as such.
  Official HKO radar imagery is shown in its own panel card (64/128/256 km, 6-minute
  frames with a scrubber) as published — not re-projected onto the map, so there is
  no georeferencing guesswork. If RainViewer tiles fail, the page says so visibly.
- **Isobars and "L?" forming-low badges are model output** on a 2° grid — an
  organising disturbance can appear there before any agency numbers it, and can also
  be a false alarm. They never use warning colours and never imply official status.
- **AQHI arrives via hourly Actions ingest** because EPD's feed blocks browser CORS;
  the EPD record time is displayed, and a stale copy is flagged as stale.
- JMA's bosai endpoints are the feeds behind JMA's own site, not a documented API;
  paths can change without notice. The daily health check exists for exactly this.
- The "What changed" briefing compares against *your previous visit on this device* —
  the scope is stated in the UI. Canonical update-to-update diffs would need
  Actions-committed snapshots (roadmap).

## Roadmap

1. **HKO TC track layer** — HKO publishes its own tropical-cyclone track products;
   drawing them beside JMA's is the first step of multi-agency comparison.
2. **Verification view** — after each storm, overlay agency forecast tracks on the
   final best track; for daily weather, score the model board and HKO against what
   the stations actually observed.
3. **PAGASA ingest** — GitHub Actions parser for bulletin status → committed `.js` file
   with honest per-source freshness.
4. **Surveyed station coordinates** from the CSDI dataset.
5. **Himawari animation** (frame scrubber, like the radar timeline).
6. **Ensemble spread for the genesis watch** — the deterministic "L?" detection now
   ships; adding ensemble member agreement is the next step in confidence display.

## Attribution

Weather data © Hong Kong Observatory (HKO Open Data). Typhoon analysis and Himawari
imagery © Japan Meteorological Agency. Model forecasts via Open-Meteo (free for
non-commercial use — review their terms under heavy traffic). Radar composite ©
RainViewer. Basemap © OpenStreetMap contributors. This Atlas issues no warnings;
verify all warnings with HKO.
