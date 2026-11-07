# Final QA: Steps 5–6 plan (supervisor, 2026-11-06 14:22 PST)

Prerequisite: finish the C-2 repro first (main = f93f7d2 is live since 14:20:35). Run it on the HOST in R1: tap on-screen O,k → Send, twice. Then type one more word, let autocorrect act, and Send. After each Send check three things: the composer is empty, Send is disabled, and the keyboard did not visibly drop and return. Screenshots final-3-c2-fixed-*.png. Report it, then continue below without waiting unless it FAILS.

Fixtures: R1 only (R3 is reserved for expiry). Create no rooms or accounts. Navigate normally: Rooms → R1 → header "Map". Do not use deep links into rooms.

## Step 5: Map route and activity
1. HOST: R1 → Map. If prompted, allow location ("While Using"). The developer sets the simulated locations BEFORE this step:
   - host: `simctl location <host> set 37.7793,-122.4193`
   - guest: `simctl location <guest> set 37.7810,-122.4170`
2. HOST: add 3 route points by tapping the map at three clearly separate spots → Save route. Screenshot final-5-host-route.png.
3. GUEST: R1 → Map. The same route (3 points, same shape) must appear without reopening, or after at most one reopen; record which. Screenshot final-5-guest-route.png.
4. HOST: Start activity. GUEST: turn location sharing ON. Both maps: the guest pin and name show; the host list row shows the guest. Screenshots final-5-{host,guest}-sharing.png.
5. HOST: End activity. Within about 10 s the guest pin and row disappear on the host, and the guest UI shows that sharing has stopped. Screenshots final-5-{host,guest}-ended.png. The supervisor checks live_presence for R1 = 0.
6. Sign out while sharing: NOT RUN (it needs step 9 first). Record "NOT RUN".
STOP and report.

## Step 6: Location loss (the human made this a required check)
Pre: Start activity again and turn guest sharing ON, then confirm the host shows a fresh guest pin.
- 6a: the developer runs `simctl location <guest> clear` and posts the time in the ledger. Codex watches the HOST for up to 120 s and reports the exact text and pin color, with the elapsed time at which "stale" (or anything else) appeared. Screenshot final-6a-host.png, plus final-6a-guest.png showing what the guest sees.
  - Then the developer restores it: `simctl location <guest> set 37.7810,-122.4170`. The host shows the pin fresh again (record the time).
- 6b: GUEST iOS Settings → Privacy & Security → Location Services → Moment → Never. Return to the app. Record the guest UI text and the host UI (pin/row/stale text) for up to 120 s. Screenshots final-6b-{guest,host}.png.
  - Restore: the same setting → While Using the App. Return to the app; the host shows a fresh pin.
- End activity on the host. STOP and report.

No background tracking is expected. A stale or "location unavailable" state is a valid truthful result. A pin that keeps looking fresh after the fix is lost is a FAIL.
