# Apply instructions — ingest pipeline fix

Three changes, all in the repo root / .github/workflows:

1. **Add** `.github/workflows/atlas-ingest.yml` (in this zip).
2. **Delete** `.github/workflows/update-tctrack.yml` and
   `.github/workflows/update-aqhi.yml` — they must not survive, or they will
   race the new workflow and reintroduce the bug.
3. **Replace** `REVISION_NOTES.md` with the copy in this zip (your current
   file + the incident entry appended).

Do all three in ONE commit (GitHub web UI: upload the two files, then delete
the two old workflows — or locally: copy, `git rm` the old workflows, one
commit, push).

Then: Actions tab → "HK Atlas data ingest" → **Run workflow** (manual
dispatch) to pull the current bulletin immediately instead of waiting for
:12/:42. Verify the run goes green and hk_tctrack.js gains a fresh
generatedAt.

Optional but recommended: Actions tab → check the run history of the old
"HKO TC track ingest" workflow for today — you should see the failed runs
(rejected pushes) that confirm the race. No action needed on them.
