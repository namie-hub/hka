#!/usr/bin/env node
/* test_uv.js — contract tests for the Now card's UV selection logic.
 *
 * The logic under test is extracted VERBATIM from index.html between the
 * "UV selection logic" markers, so these tests exercise the shipped code,
 * not a copy that can drift away from it. No dependencies: plain node.
 *
 * Run: node scripts/test_uv.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const START = "==== UV selection logic (pure; extracted verbatim by scripts/test_uv.js) ====";
const END = "==== end UV selection logic ====";
const a = html.indexOf(START), b = html.indexOf(END);
if (a < 0 || b < 0) {
  console.error("FAIL: UV selection markers not found in index.html — did the block get renamed?");
  process.exit(1);
}
const src = html.slice(html.indexOf("*/", a) + 2, html.lastIndexOf("/*", b));
const { uvBand, uvInfoTime, pickUv } = new Function(
  src + "\nreturn {uvBand, uvInfoTime, pickUv};"
)();

let failures = 0;
function check(name, cond, got) {
  if (cond) { console.log(`OK    ${name}`); }
  else { failures++; console.error(`FAIL  ${name}${got !== undefined ? " — got " + JSON.stringify(got) : ""}`); }
}

const T = iso => Date.parse(iso);
const NOW = T("2026-09-14T13:05:00+08:00");

/* The real 14 Sep 2026 defect: rhrread reported at 12:02 an hourly mean of 1
   (the 11:00-12:00 thunderstorm window) while the 15-min file had 5 at 12:45. */
const FILE_1245 = { value: 5, recordTime: "2026-09-14T12:45:00+08:00" };
const RHR_1202 = { value: 1, reportedAt: "2026-09-14T12:02:00+08:00" };

let r = pickUv(FILE_1245, RHR_1202, T("2026-09-14T12:54:00+08:00"));
check("the reported defect: 15-min mean wins over the hourly mean",
  r.state === "ok" && r.value === 5 && r.basis === "15-min mean" && r.degraded === false, r);

/* A freshly REPORTED hourly mean must not outrank a genuinely newer reading:
   rhrread stamped 13:02 still describes 12:00-13:00. */
r = pickUv({ value: 5, recordTime: "2026-09-14T13:00:00+08:00" },
  { value: 1, reportedAt: "2026-09-14T13:02:00+08:00" }, NOW);
check("report time does not beat information time (tie goes to the finer average)",
  r.value === 5 && r.basis === "15-min mean", r);

/* An hourly mean whose window genuinely ends later does win. */
r = pickUv({ value: 2, recordTime: "2026-09-14T11:45:00+08:00" },
  { value: 4, reportedAt: "2026-09-14T13:02:00+08:00" }, NOW);
check("lagging ingest degrades to the hourly mean and says so",
  r.value === 4 && r.basis === "hourly mean" && r.degraded === true, r);

/* Ingest stalled mid-afternoon, rhrread also unavailable. */
r = pickUv({ value: 7, recordTime: "2026-09-14T11:45:00+08:00" }, null, NOW);
check("stale ingest is flagged stale, not shown as now",
  r.state === "stale" && r.ageMin === 80, r);

/* Overnight: the file still holds the 18:00 value, rhrread publishes "". */
r = pickUv({ value: 3, recordTime: "2026-09-14T18:00:00+08:00" },
  { value: "", reportedAt: "2026-09-14T23:02:00+08:00" }, T("2026-09-14T23:05:00+08:00"));
check("overnight: the last daytime value expires rather than lingering as current",
  r.state === "expired" && r.at === T("2026-09-14T18:00:00+08:00"), r);

/* hk_uv.js absent entirely (hand upload missed it) — the page must not die. */
r = pickUv(null, RHR_1202, T("2026-09-14T12:20:00+08:00"));
check("missing data file falls back cleanly to the live feed",
  r.state === "ok" && r.value === 1 && r.basis === "hourly mean" && r.degraded === false, r);

/* Late in the hour, an hourly mean IS old information — say so. This is the
   whole point of the fix: the old card showed exactly this as "now". */
r = pickUv(null, RHR_1202, T("2026-09-14T12:54:00+08:00"));
check("an hourly mean read at 12:54 is flagged as 54-minute-old information",
  r.state === "stale" && r.ageMin === 54, r);

/* Nothing at all. */
r = pickUv(null, { value: "", reportedAt: "2026-09-14T03:02:00+08:00" }, T("2026-09-14T03:05:00+08:00"));
check("no source at all reports nothing rather than a number", r.state === "none", r);

/* Malformed inputs must not produce NaN on screen. */
r = pickUv({ value: "n/a", recordTime: "not a date" }, { value: 3, reportedAt: "2026-09-14T13:02:00+08:00" }, NOW);
check("unparseable file record is ignored, not rendered as NaN",
  r.value === 3 && r.src === "rhrread", r);

check("zero is a real UV value, not a missing one",
  pickUv({ value: 0, recordTime: "2026-09-14T13:00:00+08:00" }, null, NOW).value === 0);

/* WHO exposure bands, on the boundaries. */
const bands = [[0, "Low"], [2, "Low"], [3, "Moderate"], [5, "Moderate"], [6, "High"],
[7, "High"], [8, "Very high"], [10, "Very high"], [11, "Extreme"], [15, "Extreme"]];
check("WHO exposure bands map on every boundary",
  bands.every(([v, name]) => uvBand(v) === name),
  bands.map(([v]) => uvBand(v)));
check("fractional values band correctly", uvBand(2.9) === "Low" && uvBand(3.0) === "Moderate");
check("non-numeric bands to empty string", uvBand("") === "" && uvBand(undefined) === "");

check("hourly report floors to its own hour",
  uvInfoTime("2026-09-14T13:59:00+08:00") === T("2026-09-14T13:00:00+08:00"));

if (failures) {
  console.error(`\n${failures} UV test(s) failing.`);
  process.exit(1);
}
console.log("\nAll UV selection tests passed.");
