#!/usr/bin/env node
/* check_feeds.js — Hong Kong Weather Atlas feed health check.
 *
 * Run daily by GitHub Actions. Exits non-zero if any feed fails, so the
 * workflow failure email is the alert. Mirrors the Japan Atlas pattern:
 * retries, JSON validation, and a per-feed verdict — a passing check means
 * the endpoint answered AND the payload had the shape the Atlas parses.
 */
"use strict";

const FEEDS = [
  {
    id: "hko-warnsum",
    url: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=warnsum&lang=en",
    validate: d => typeof d === "object" && d !== null // {} is valid: no warnings in force
  },
  {
    id: "hko-rhrread",
    url: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en",
    validate: d => Array.isArray(d?.temperature?.data) && d.temperature.data.length > 10
  },
  {
    id: "hko-flw",
    url: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=en",
    validate: d => typeof d?.forecastDesc === "string"
  },
  {
    id: "hko-fnd",
    url: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=en",
    validate: d => Array.isArray(d?.weatherForecast) && d.weatherForecast.length >= 8
  },
  {
    id: "hko-tide-hhot",
    url: `https://data.weather.gov.hk/weatherAPI/opendata/opendata.php?dataType=HHOT&station=QUB&year=${new Date().getFullYear()}&rformat=json`,
    validate: d => Array.isArray(d?.data) && d.data.length > 300
  },
  {
    id: "hko-swt",
    url: "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=swt&lang=en",
    validate: d => typeof d === "object" && d !== null // {} or {swt:[]} is valid: no tips in force
  },
  {
    id: "jma-target-tc",
    url: "https://www.jma.go.jp/bosai/typhoon/data/targetTc.json",
    validate: d => Array.isArray(d) // empty array is valid: no active systems
  },
  {
    id: "jma-himawari-times",
    url: "https://www.jma.go.jp/bosai/himawari/data/satimg/targetTimes_fd.json",
    validate: d => Array.isArray(d) && d.length > 0 && typeof d[d.length - 1].basetime === "string"
  },
  {
    id: "openmeteo-models",
    url: "https://api.open-meteo.com/v1/forecast?latitude=22.302&longitude=114.174&daily=temperature_2m_max&models=ecmwf_ifs025,gfs_seamless&timezone=Asia%2FHong_Kong&forecast_days=2",
    validate: d => Array.isArray(d?.daily?.time) && "temperature_2m_max_ecmwf_ifs025" in (d.daily || {})
  },
  {
    id: "epd-aqhi-rss",
    url: "https://www.aqhi.gov.hk/epd/ddata/html/out/aqhi_ind_rss_Eng.xml",
    raw: true,
    validate: t => typeof t === "string" && t.includes("<item>") && t.includes("General Stations")
  },
  {
    id: "hko-tctrack-list",
    url: "https://www.weather.gov.hk/wxinfo/currwx/tc_list.xml",
    raw: true, // XML; no CORS headers on any host — that's why ingest_tctrack.py exists
    validate: t => typeof t === "string" && t.includes("TropicalCycloneList")
    // an empty list (possibly self-closing <TropicalCycloneList/>) is valid:
    // no forecast track issued
  },
  {
    id: "rainviewer-maps",
    url: "https://api.rainviewer.com/public/weather-maps.json",
    validate: d => Array.isArray(d?.radar?.past) && d.radar.past.length > 0
  }
];

async function fetchWithRetry(url, tries = 3, raw = false) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      // 20 s per attempt: a feed that answers slowly or not at all becomes a
      // reported FAIL instead of stalling the whole job (fetch has no default
      // timeout; one dead feed could otherwise hang for many minutes).
      const r = await fetch(url, {
        headers: { "User-Agent": "hk-weather-atlas-feed-check" },
        signal: AbortSignal.timeout(20000)
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return raw ? await r.text() : await r.json();
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

(async () => {
  let failures = 0;
  for (const feed of FEEDS) {
    try {
      const data = await fetchWithRetry(feed.url, 3, feed.raw === true);
      if (!feed.validate(data)) throw new Error("payload shape changed — Atlas parser may break");
      console.log(`OK    ${feed.id}`);
    } catch (e) {
      failures++;
      console.error(`FAIL  ${feed.id}: ${e.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} feed(s) failing. Bring this log to a debugging session.`);
    process.exit(1);
  }
  console.log("\nAll feeds healthy.");
})();
