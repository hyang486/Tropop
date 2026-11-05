# Chat UI manual check (two clients)

Status: PENDING (human-assisted). UI automation (agent-device) was denied and is not used.
Simulators: A = iPhone 17 Pro `20541309-C36F-4864-94CA-D8A341F70EEB`, B = iPhone 17 `F11BA960-84AE-4AFA-A234-92800AF43B9E`.
The developer starts Metro, installs the dev build on both, takes screenshots with `xcrun simctl io <udid> screenshot docs/evidence/chat-<step>-<A|B>.png`, and checks the server rows. Test accounts are deleted afterwards by exact ID.

| # | Who | Action | Expected |
|---|---|---|---|
| 1 | A | Sign up as host "QA Chat Host", create a 1-day room, open Invite | QR + 5-digit code |
| 2 | B | Continue as guest "QA Chat Guest", Join with the code | Room opens, chat shows "No messages yet. Say hello." |
| 3 | A | Send "hello from A" | Appears on A, then on B within ~2 s without refresh |
| 4 | B | Send "hi from B" | Appears on B, then on A |
| 5 | B | Send 3 quick messages "1", "2", "3" | Same order on both |
| 6 | B | Turn the Mac's Wi-Fi off, send "offline test" | "Sending…" then "Not sent. Tap to retry." |
| 7 | B | Wi-Fi on, tap the failed message, Retry | Sent once; A shows it once (no duplicate) |
| 8 | A | Wi-Fi off ~10 s, then on | "Reconnecting…" then normal; messages sent by B meanwhile appear |
| 9 | B | Leave the room | B back at Rooms; A shows B's old messages from "Former member" or the B name (record which) |
| 10 | A | End room for everyone | Room gone on A |

Record per step: PASS / FAIL + screenshot file name.

## Results so far (2026-11-04, PST)

Actual roles in the run: host "Test" on iPhone 17 (F11BA960), guest "Test joiner" on iPhone 17 Pro (20541309), room "test chat" `031bc8aa-17c0-402c-bc52-bb2ba36fa54f`.

| # | Result | Evidence |
|---|---|---|
| 3/4 | PASS (two-way): "Gets" from host and "Dsfsdf" from guest appear on both, confirmed by the human | `manual-chat-A-ready.png`, `manual-chat-B-ready.png`, `chat-banner-fixed-17pro.png` |
| 5-10 | NOT RUN | needs taps (UI control) |

Layout fix (room screen header overlap):
- Before: on iOS 26 the translucent native header overlaid "Ends in" and the reminder banner; the keyboard avoider was offset by the header height, leaving a gap above the keyboard.
- After: the root measures its window Y and pads only by the header overlap; the keyboard offset uses the measured Y. The banner title is now "Room ends soon" and the remaining time is in the body.
- Verified: `chat-banner-fixed-17pro.png` (17 Pro, keyboard closed). NOT yet verified: keyboard open + input bar, and the iPhone 17 host screen.
- Note: Metro had been started with `CI=1` (no file watching), so the earlier device check after the edit was still showing the old bundle. Metro now runs without `CI=1`.

Stale session restore (`verifyAccount` in `src/lib/auth.tsx`): after the reload both existing valid sessions (host and guest) restored and stayed signed in, so there's no false sign-out. The deleted-account path (server 401/403/`user_not_found` → local sign-out + welcome notice) is not exercised on device yet.

### U3a (supervisor fix): stricter account-gone classifier
- `src/lib/account-check.ts` (pure, `checkAccount`): `user_not_found` → gone. `bad_jwt`/401/403 → one `refreshSession()`. After that it's gone only if the refresh fails with `refresh_token_not_found`/`session_not_found`/`user_not_found`, or `getUser` then returns `user_not_found`. Everything else (network, 500, `refresh_token_already_used`, persisting `bad_jwt`) → unknown, and the session is kept.
- `npm test` (node --test, `tests/account-check.test.mjs`): 10/10 pass. tsc 0, lint clean.
- Live check against the real auth server: throwaway anonymous user `cabb68d7-5c56-4f47-a1ac-1a1a519ceeda` created via the API; `checkAccount` = `ok` before deletion.
- Deleted the user by exact ID (`id=… and is_anonymous and email is null`, approved through the normal flow), then re-ran the check on the stored session: real server `getUser` → `AuthApiError 403 user_not_found`, `checkAccount` = `gone`. Cleanup: auth.users / profiles / auth.sessions / auth.refresh_tokens for that ID = 0.
- Not run: the on-device relaunch (welcome screen + notice) for a deleted account. The classifier and the server response are verified; the UI notice path is code-only.
