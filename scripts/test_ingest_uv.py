#!/usr/bin/env python3
"""test_ingest_uv.py — parser contract tests for ingest_uv.py.

Fixtures are verbatim bodies captured from HKO on 14 Sep 2026, so a format
change upstream fails here rather than silently writing a wrong number.

Run: python3 scripts/test_ingest_uv.py
"""
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest_uv import HKT, band, num, parse_csv, parse_curve  # noqa: E402

# Verbatim from latest_15min_uvindex.csv at 12:47 HKT on 14 Sep 2026 — the
# value HKO's UV page displayed while the Atlas's Now card still read 1.
CSV_OK = "Date time,past 15-minute mean UV Index\n202609141245,5\n"
CSV_UC = "\ufeff日期 時間,過去十五分鐘平均紫外線指數\n202609141245,5\n"

# Verbatim head of uv15min_daws.txt the same afternoon. Note 12.75 == 12:45.
CURVE_OK = (
    "20260914\n5.00\t0.0\n6.00\t0.0\n7.00\t0.1\n7.25\t0.2\n"
    "11.75\t1\n12.00\t1\n12.25\t2\n12.50\t3\n12.75\t5\n13.00\t5\n"
)


class ParseCsv(unittest.TestCase):
    def test_reads_value_and_treats_stamp_as_hong_kong_time(self):
        when, value = parse_csv(CSV_OK)
        self.assertEqual(value, 5)
        self.assertEqual(when, datetime(2026, 9, 14, 12, 45, tzinfo=HKT))
        # The stamp carries no offset; reading it as UTC would place the
        # record 8 hours in the future and mask a genuinely stalled feed.
        self.assertEqual(when.astimezone(timezone.utc).hour, 4)

    def test_rejects_a_changed_header(self):
        with self.assertRaises(ValueError):
            parse_csv("Date time,something else entirely\n202609141245,5\n")

    def test_rejects_a_truncated_file(self):
        with self.assertRaises(ValueError):
            parse_csv("Date time,past 15-minute mean UV Index\n")

    def test_rejects_a_malformed_timestamp(self):
        with self.assertRaises(ValueError):
            parse_csv("Date time,past 15-minute mean UV Index\n2026-09-14 12:45,5\n")

    def test_blank_value_raises_rather_than_reading_as_zero(self):
        # A sensor gap must not publish UV 0 "low" on a clear afternoon.
        with self.assertRaises(ValueError):
            parse_csv("Date time,past 15-minute mean UV Index\n202609141245,\n")

    def test_tolerates_the_bom_on_the_chinese_variant(self):
        # Included only to prove the utf-8-sig decode survives it; the English
        # file is the one actually ingested.
        with self.assertRaises(ValueError):
            parse_csv(CSV_UC)  # header check correctly rejects the zh columns


class ParseCurve(unittest.TestCase):
    def test_decimal_hours_become_clock_times(self):
        curve = parse_curve(CURVE_OK, datetime(2026, 9, 14, 13, 0, tzinfo=HKT))
        self.assertIn(["12:45", 5], curve)
        self.assertIn(["12:15", 2], curve)
        self.assertEqual(curve[0], ["07:00", 0.1])

    def test_drops_rows_before_the_publication_window(self):
        curve = parse_curve(CURVE_OK, datetime(2026, 9, 14, 13, 0, tzinfo=HKT))
        self.assertTrue(all(row[0] >= "07:00" for row in curve))

    def test_skips_not_yet_measured_slots(self):
        curve = parse_curve("20260914\n12.00\t3\n12.25\t\n12.50\tM\n",
                            datetime(2026, 9, 14, 13, 0, tzinfo=HKT))
        self.assertEqual(curve, [["12:00", 3]])

    def test_rejects_yesterdays_file(self):
        # A frozen curve file would otherwise paste yesterday's afternoon onto
        # today's card.
        with self.assertRaises(ValueError):
            parse_curve(CURVE_OK, datetime(2026, 9, 15, 13, 0, tzinfo=HKT))


class Bands(unittest.TestCase):
    def test_who_exposure_categories(self):
        for value, name in [(0, "Low"), (2, "Low"), (2.9, "Low"), (3, "Moderate"),
                            (5, "Moderate"), (6, "High"), (7, "High"),
                            (8, "Very high"), (10, "Very high"), (11, "Extreme")]:
            self.assertEqual(band(value), name, f"UV {value}")

    def test_integral_values_ship_as_ints(self):
        # So the card prints "UV 5", not "UV 5.0".
        self.assertIsInstance(num(5.0), int)
        self.assertEqual(num(3.5), 3.5)


if __name__ == "__main__":
    unittest.main(verbosity=2)
