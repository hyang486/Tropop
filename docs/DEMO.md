# Moment draft — demo instructions and remaining gaps

Status as of 2026-11-05. Evidence and history: `docs/CURRENT_STATE.md`, `docs/implementation-status.md`.
"Verified" means a recorded run with server or device evidence. Everything else is labelled.

## 1. Run the draft (iOS simulators)

1. Node 24: `export PATH=/Users/hyeonminyang/.local/share/iya-development/node-v24.22.2-darwin-arm64/bin:$PATH`
2. In `mobile/`: `npx expo start --dev-client` (never with `CI=1`; it disables file watching).
3. Two booted simulators with the Moment dev build installed: iPhone 17 Pro (guest) and iPhone 17 (host).
   If the build is missing or stale: `npx expo prebuild --platform ios` then
   `npx expo run:ios --device <UDID>`; `mobile/ios` is generated, never edited by hand.
4. After adding a new route file, relaunch the app; Fast Refresh alone shows "Unmatched Route".
5. Deep links use the `moment://` scheme, for example `moment://room/<room id>/map`, `moment:///plan-preview`.

Existing QA accounts (keep them): host "Test" (test@example.com) on the iPhone 17, guest "Test joiner" on the 17 Pro.
Passwords are not stored in the repo. Create any extra test data with disposable accounts and record exact IDs.

## 2. Walkthrough

| Step | What to do | State |
|---|---|---|
| Host sign-in, guest entry | Welcome → Sign in (host) / Continue as guest | Verified |
| Create room | Rooms → Create room: name, type, expiry (3 h – 7 days), location allowed, statuses | Verified |
| Invite and join | Room → Invite (QR / 5-digit code / link); guest → Join a room | Verified |
| Chat | Send messages both ways | Two-way verified; keyboard-open layout verified (17 Pro, 2026-11-05); typing/sending with the keyboard open and checklist steps 5–10 not verified |
| Photo upload / download | Room → Photos → add; other device → open → Download original | Byte-exact verified (photo) |
| Video upload | Same flow with a video; progress, leave and return, cancel, Retry | Implemented, not verified on device |
| Arrival / status / Emergency | Room → Arrived; status sheet; Emergency → other device sees banner, "I see it", "I'm OK" | Verified (2026-11-05 run in room 94673) |
| Expiry reminder | Room ending in about 24 h + 3 min; the local reminder fires about 3 min later | Server live; device firing and tap not verified |
| Map / location | Host allows location, Start activity; members opt in; markers, route, speed, stale label | Screens render; taps and live markers not verified |
| Profile photo | Profile → Add photo | Code committed; blocked: migration 0021 not live |
| Delete account | Profile → Delete account (disposable accounts only) | Code committed; blocked: 0021 not live, delete-account not deployed |
| Plus preview | Profile → Plus plan preview, or the link on New room | Render verified; "Get Plus" only explains, no payment |
| Face matching | Gallery face feature | Scaffolding only; no live CompareFaces run (needs rights-cleared photos) |
| Expiry cleanup | Room expires → access denied; room-janitor deletes Storage objects | Verified (live janitor runs) |

## 3. Remaining gaps

Blocked on the human
- Migration 0021 live apply and delete-account deploy: denied by the Claude Code auto-mode classifier. Needs an allow
  rule or a human apply. Then: post-apply check, no-token request returns 401, device QA (photo set/replace/remove
  seen by a co-member, guest and host deletion).
- Face matching: rights-cleared test photos for a live AWS CompareFaces run.

Implemented, not verified on device
- Sports/location: Start activity, permission prompt, opt-in, live markers on the other device, stale label, route
  save/sync, End activity clearing positions, sign-out stop, a quick 3x share toggle, and revoking the location
  permission then relaunching (M3).
- Video: large upload with progress, leaving the gallery mid-upload, cancel, forced failure + Retry, playback and
  original download hash.
- 24-hour reminder firing and tap (including the tap on an ended room).
- Chat typing/sending with the keyboard open; live photo appearance without a refresh; the duplicate-notification check.
- Gallery: All/Mine/Others clear of the header (not re-seen after the fix); preview rendering; the >50 MB
  "Too large to share" notice on a device.
- Plus preview "Get Plus" alert and its two entry links (render only so far).
- Member-list avatars (needs 0021 live).

Known limits (accepted for the draft)
- M1: map markers show initials, not photos (expo-maps markers support only a monogram or SF Symbol).
- M4: route drawing is tap-to-add points; no freehand drawing.
- A2: a profile photo uploaded but never saved to the profile stays in Storage until account deletion.
- V2: if iOS finishes a background upload after the app was terminated, the object stays under a non-ready row
  until the room expires.
- No resume for partial uploads; Retry re-sends the whole file. 50 MB per file (Supabase Free plan, final).
- C6: Android maps need a Google Maps API key; Android is a follow-up.
- Some failure hints still show the raw Supabase/Storage error message verbatim.
- U4: the guest Rooms list can show an ended room as "Ends in Ended" until a refresh (cleared on relaunch).
- No real push (APNs) delivery, no real payment; locked-phone background location is not claimed.
