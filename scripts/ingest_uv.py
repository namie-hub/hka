#!/usr/bin/env python3
"""ingest_uv.py — fetch HKO's 15-minute mean UV index and write hk_uv.js.

Why this exists: the Now card used to read UV from `rhrread`, whose
`uvindex` field is documented by HKO as "During the past hour" and only
refreshes hourly. On 14 Sep 2026 at 12:54 HKT the Atlas showed UV 1 (the
11:00-12:00 mean, measured during a thunderstorm) while HKO's own UV page
showed 5. Both numbers were correct; the Atlas was reading the wrong one.

Every 15-minute UV source HKO publishes is CORS-locked — verified against
`latest_15min_uvindex.csv`, `uv15min.txt`, `uv15min_daws.txt` and
`rss.weather.gov.hk`: none returns an Access-Control-Allow-Origin header,
so a static page cannot fetch them live. Same wall as the EPD AQHI feed,
same answer: ingest in Actions, commit a data file, show the record time.

Primary source is the DATA.GOV.HK open-data CSV, because that is the
licensed reuse route AND its value is the one HKO's public UV page
displays. The day curve is a best-effort extra from the file HKO's own UV
page reads; if it fails, the point value still ships.

Note there are two different sensor series: `uv15min.txt` and
`uv15min_daws.txt` disagree (3.5 vs 5 at 12:45 on 14 Sep 2026). The _daws
series is the one matching the published index, so that is the one used.

Publication window is 07:00-18:00 HKT. Outside it, this script is a
deliberate no-op returning success: there is nothing new to fetch, the
last committed value stays put, and the page ages it out on its own.

Output is a <script>-tag data file (the Atlas's standard pattern):
    const HK_UV = { generatedAt, recordTime, value, desc, station,
                    basis, source, curve: [["HH:MM", v], ...] };

Commit-only-on-change: compare everything EXCEPT generatedAt, so a run
that fetched identical data produces no commit (see workflow).
"""
from __future__ import annotations

import json
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

CSV = "https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_15min_uvindex.csv"
CURVE = "https://www.hko.gov.hk/wxinfo/uvinfo/record/uv15min_daws.txt"
OUT = Path(__file__).resolve().parent.parent / "hk_uv.js"

HKT = timezone(timedelta(hours=8))
UA = {"User-Agent": "hk-weather-atlas-uv-ingest"}

# WHO exposure categories, same ladder HKO colours its table with.
BANDS = [(11, "Extreme"), (8, "Very high"), (6, "High"), (3, "Moderate"), (0, "Low")]


def num(v: float):
    """Integral values ship as ints so the page prints 3, not 3.0."""
    return int(v) if float(v).is_integer() else v


def band(v: float) -> str:
    for floor, name in BANDS:
        if v >= floor:
            return name
    return "Low"


def get(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8-sig", "replace")


def parse_csv(text: str) -> tuple[datetime, float]:
    """Parse the two-line open-data CSV. Raises ValueError on format drift."""
    rows = [r.strip() for r in text.splitlines() if r.strip()]
    if len(rows) < 2:
        raise ValueError(f"expected header + data row, got {len(rows)} line(s)")
    if "UV Index" not in rows[0]:
        raise ValueError(f"unexpected header: {rows[0]!r}")
    stamp, _, value = rows[-1].partition(",")
    stamp, value = stamp.strip(), value.strip()
    if len(stamp) != 12 or not stamp.isdigit():
        raise ValueError(f"unexpected timestamp: {stamp!r}")
    # Stamp carries no offset; HKO publishes it in Hong Kong time.
    when = datetime.strptime(stamp, "%Y%m%d%H%M").replace(tzinfo=HKT)
    return when, float(value)  # ValueError here if the value is blank or "-"


def parse_curve(text: str, day: datetime) -> list[list]:
    """Best effort: [["HH:MM", value], ...] for the current day, 07:00 onward.

    Format is a date line then "<decimal hour>\\t<value>" rows, where 12.75
    means 12:45. Rows for the rest of the day may be absent or blank.
    """
    rows = [r for r in text.splitlines() if r.strip()]
    if not rows or rows[0].strip() != day.strftime("%Y%m%d"):
        raise ValueError(f"curve file is for a different day: {rows[0].strip()!r}")
    out = []
    for row in rows[1:]:
        hour, _, value = row.partition("\t")
        try:
            h, v = float(hour), float(value)
        except ValueError:
            continue  # blank or not-yet-measured slot
        if h < 7:
            continue  # outside the publication window; always 0.0
        out.append([f"{int(h):02d}:{int(round((h % 1) * 60)):02d}", num(v)])
    if not out:
        raise ValueError("no usable rows in curve file")
    return out


def main() -> int:
    now_hkt = datetime.now(HKT)
    if not (7 <= now_hkt.hour < 19):
        print(f"OK: {now_hkt:%H:%M} HKT is outside the 07:00-18:00 publication "
              f"window — nothing to fetch, leaving hk_uv.js untouched.")
        return 0

    try:
        when, value = parse_csv(get(CSV))
    except ValueError as e:
        # A blank value inside the window happens (sensor gap, 07:00 edge).
        # Leave the last good file in place; the page ages it out itself.
        print(f"WARN: no usable UV value ({e}) — leaving hk_uv.js untouched", file=sys.stderr)
        return 0

    age_min = (datetime.now(timezone.utc) - when).total_seconds() / 60
    if age_min > 90:
        print(f"FAIL: newest UV record is {age_min:.0f} min old — source may be frozen",
              file=sys.stderr)
        return 1

    try:
        curve = parse_curve(get(CURVE), when)
    except Exception as e:  # noqa: BLE001 — the curve is decoration, never fatal
        print(f"WARN: day curve unavailable ({e})", file=sys.stderr)
        curve = []

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "recordTime": when.isoformat(),
        "value": num(value),
        "desc": band(value),
        "station": "King's Park",
        "basis": "15-minute mean",
        "source": "HKO open data latest_15min_uvindex.csv (CORS-locked; "
                  "ingested every 15 min by GitHub Actions, 07:00-18:00 HKT)",
        "curve": curve,
    }
    body = json.dumps({k: v for k, v in payload.items() if k != "curve"}, indent=2)
    curve_json = json.dumps(curve, separators=(",", ""))
    body = body[:-2] + ",\n  \"curve\": " + curve_json + "\n}"
    OUT.write_text(
        "/* hk_uv.js — GENERATED by scripts/ingest_uv.py. Do not edit by hand.\n"
        " * HKO publishes a 15-minute mean UV index 07:00-18:00 HKT and blocks\n"
        " * direct browser fetches (no CORS headers on any of its UV files), so\n"
        " * Actions ingests it. The page shows the record time and the averaging\n"
        " * basis, and falls back to rhrread's hourly mean if this copy ages out. */\n"
        f"const HK_UV = {body};\n",
        encoding="utf-8",
    )
    print(f"OK: UV {value} ({band(value)}) at {when:%d %b %H:%M} HKT, "
          f"{len(curve)} curve points")
    return 0


if __name__ == "__main__":
    sys.exit(main())
