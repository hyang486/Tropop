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
