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
    id: "hko-uv-15min",
    url: "https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_15min_uvindex.csv",
    raw: true, // CSV; no CORS headers on any HKO UV file — that's why ingest_uv.py exists
    validate: t => typeof t === "string" && t.includes("UV Index") &&
      /^\d{12},/m.test(t.split("\n").slice(1).join("\n"))
    // a blank value is valid (sensor gap, or outside 07:00-18:00 HKT); a
    // missing or non-numeric TIMESTAMP is not — that is a format change
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

async function checkFeed(feed) {
  try {
    const data = await fetchWithRetry(feed.url, 3, feed.raw === true);
    if (!feed.validate(data)) throw new Error("payload shape changed — Atlas parser may break");
    return null;
  } catch (e) {
    // AbortSignal.timeout rejects with a TimeoutError whose message is vague.
    return e && e.name === "TimeoutError" ? "timed out after 20 s (x3)" : String(e && e.message || e);
  }
}

async function runPass(feeds, label) {
  const failed = [];
  for (const feed of feeds) {
    const err = await checkFeed(feed);
    if (err) {
      failed.push({ feed, err });
      console.log(`FAIL  ${feed.id}: ${err}${label}`);
    } else {
      console.log(`OK    ${feed.id}${label}`);
    }
  }
  return failed;
}

function writeSummary(lines) {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (!p) return;
  try { require("fs").appendFileSync(p, lines.join("\n") + "\n"); } catch (_) { /* summary is best-effort */ }
}

(async () => {
  // Pass 1, then re-check only the failures once after RECHECK_DELAY_S
  // (default 120 s). A feed fails the run only if it fails both passes —
  // a one-off upstream blip (e.g. an Open-Meteo connection timeout) is
  // logged as a warning, not emailed as a failure.
  const delayS = Math.max(0, Number(process.env.RECHECK_DELAY_S ?? 120) || 0);
  const first = await runPass(FEEDS, "");
  let still = first;
  if (first.length) {
    console.log(`\n${first.length} feed(s) failed pass 1; re-checking in ${delayS}s…`);
    await new Promise(res => setTimeout(res, delayS * 1000));
    still = await runPass(first.map(f => f.feed), "  (recheck)");
  }
  const recovered = first.filter(f => !still.some(s => s.feed.id === f.feed.id));

  for (const r of recovered) {
    console.log(`::warning title=Feed recovered on recheck::${r.feed.id}: ${r.err}`);
  }
  for (const s of still) {
    console.log(`::error title=Feed failing::${s.feed.id}: ${s.err}`);
  }

  const summary = ["## Feed health check", "", "| Feed | Result |", "|---|---|"];
  for (const feed of FEEDS) {
    const s = still.find(x => x.feed.id === feed.id);
    const r = recovered.find(x => x.feed.id === feed.id);
    summary.push(`| ${feed.id} | ${s ? "❌ " + s.err : r ? "⚠️ recovered on recheck (" + r.err + ")" : "✅ OK"} |`);
  }
  writeSummary(summary);

  if (still.length) {
    console.error(`\n${still.length} feed(s) failing on both passes: ${still.map(s => s.feed.id).join(", ")}`);
    process.exit(1);
  }
  console.log(recovered.length ? `\nAll feeds healthy after recheck (${recovered.length} transient).` : "\nAll feeds healthy.");
})();
