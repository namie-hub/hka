# Cyclone-tracking revision

This revision improves the storm-corridor experience without changing its data sources or privacy model.

- Added an impact-first Hong Kong outlook above the detail cards.
- Shows the closest centre-line approach as a rounded range and valid Hong Kong time.
- Adds an explicit forecast-confidence label based on forecast horizon.
- Surfaces the current HKO tropical-cyclone signal state.
- Renamed the technical TPFM heading to “Where the cyclone may pass”.
- Converted clickable storm cards into keyboard-accessible buttons.
- Increased important mobile navigation targets.
- Standardized the outlook provenance label as “OFFICIAL · HKO”.
- Added Hong Kong date labels beside HKO and JMA forecast-track dots.
- Reduced permanent date labels to the first, closest-approach, and final forecast points to prevent map crowding.
- Identified the lead-time assessment as an Atlas interpretation rather than an HKO-issued confidence.
- Added accessible names and expanded/collapsed states to the map layer and legend controls.
- Reworked storm-card markup for valid, keyboard-friendly button content.

The outlook explicitly avoids treating centre-line distance as an impact or warning threshold. HKO remains the sole warning authority for Hong Kong.

## Audit follow-up (merged)

The revision above was audited and kept in full. Four hardening fixes were layered on top:

- **Missing-file honesty:** with `hk_tctrack.js` absent, the outlook previously said "No HKO
  forecast track is currently issued" — a file failure rendered as an all-clear. It now says
  the data file is missing and is explicit that this is not an all-clear.
- **Stalled-ingest caution:** when the Actions ingest is over 3 h old, the outlook now carries
  the same "may be outdated" warning as the track card, instead of showing stale distances as current.
- **Warnings race:** the signal cell showed "No TC signal in force" before the warnings feed had
  ever answered. Warning state is now three-valued (checking / unavailable / answered) and the
  cell says "Checking…" until there is a real answer.
- **Multiple systems:** the outlook followed `storms[0]` regardless of distance. It now follows
  the system whose centre-line comes closest to Hong Kong and states how many others are tracked.

Refinements: the closest-approach valid time is computed exactly (analysis time + forecast hour)
instead of falling back to "+N h"; TC signal codes render as readable names ("No. 8 (NE gales)"
instead of "TC8NE"); the confidence label is explicitly attributed as the Atlas's lead-time rule
of thumb rather than an HKO product; and the track card's cross-reference was updated to the
renamed "Where the cyclone may pass" card.
