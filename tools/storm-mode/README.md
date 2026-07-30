# Storm-mode dispatcher (retired 30 Jul 2026)
Mac launchd job that force-triggers the atlas-ingest workflow at :12/:42,
guaranteeing ingest runs when GitHub's cron skips under load (built during
Typhoon Noul). Retired because the pages' pipeline heartbeat now announces
any trigger gap visibly — re-arm only for a direct-hit storm where even a
30–60 min gap is unacceptable AND the pipeline verdict must never show
stalled. Requires a valid PAT with Actions:write on this repo in
~/.config/atlas/github_pat. To re-arm:
  cp com.namie.atlas-trigger.plist ~/Library/LaunchAgents/
  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.namie.atlas-trigger.plist
