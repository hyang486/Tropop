# Final draft QA: developer setup (2026-11-06 ~13:40 PST)

JS: HEAD 27d7717 (face gallery + FG-R1). Metro PID 81232, root mobile/, port 8081. The fetched
`_layout.bundle?platform=ios` contains "Face matching is off in this draft" (fresh). Native build: the Nov 5 13:58
post-prebuild Moment.app (ExpoLocation/ExpoMaps), unchanged; no native change since.

## Simulators
| Role | Device | UDID |
|---|---|---|
| Host test@example.com | iPhone 17 | F11BA960-84AE-4AFA-A234-92800AF43B9E |
| Guest Test joiner | iPhone 17 Pro | 20541309-C36F-4864-94CA-D8A341F70EEB |
| D1 disposable (not signed up yet) | iPhone 17e | 6E0F2097-4840-413D-92CA-D266BDA71773 (booted 13:37, same Moment.app copied from the iPhone 17) |

## Dev-client connection (needs taps)
- The Mac's LAN IP changed (now 172.16.227.159). The dev client's "Recently opened" entry is http://192.168.1.131:8081,
  which is unreachable, so tapping it will fail.
- The developer terminated the app on the host and the guest, then sent
  `com.iyaproject.moment://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`.
  Both now show the system prompt "Open in "Moment"?" over the dev launcher
  (2026-11-06-final-setup-coldlaunch-{host-17,guest-17pro}.png).
- Codex: tap **Open** on both. If the launcher stays, use "Enter URL manually" → `http://127.0.0.1:8081`. On the 17e,
  open the app and use the same manual URL.
- After the tap, confirm a room gallery shows the "Me" chip. No live room exists until R1 is created, so this check
  happens at step 0/7.

## Generated fixtures (no person, no camera photo)
| File | sha256 | Added to |
|---|---|---|
| QA-pattern.jpg (800x800 checkerboard, made with Python + sips) | 035274e0…cb11 | Photos: guest 17 Pro, D1 17e |
| QA-video.mp4 (about 7 s recording of the 17e home screen/Safari, h264, 5,539,741 bytes) | ffa98939…6109 | Photos: guest 17 Pro |
| QA-file.txt (91 bytes, text) | 4c8c9108…1f75 | guest 17 Pro Files → On My iPhone (LocalStorage provider) |

Full hashes: `shasum -a 256 docs/evidence/final-qa/QA-*`.

## Step 0 navigation (developer, 13:45 PST, no taps; nothing created by the developer)
- R1 3514615f-dbc6-4d52-9513-f5f67a86bd78 (code 03424, "Final QA R1 2026-11-06"). Members: host edeaea51-e4b5-464f-82be-44e0277b2d91
  "Test" joined 21:43:44Z; member 97ed7d32-d88b-4e0a-9ddd-03477f1d64be "Test joiner" joined 21:44:23Z; both share_location false.
- Host 17: `moment:///` shows Rooms with R1 "General · Ends in 3d 23h" (shown as a sheet over the stack).
  Evidence: 2026-11-06-final-0-nav-host-17.png.
- Guest 17 Pro: `moment:///room/3514615f-dbc6-4d52-9513-f5f67a86bd78/gallery` shows "Photos & files" with chips All / Mine / Others / Me
  and "Nothing shared yet." This is the "Me" chip on the 27d7717 bundle. Evidence: 2026-11-06-final-0-nav-guest-17pro.png.
- 17e: `com.iyaproject.moment://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081` shows the Moment welcome screen
  (Continue as guest / Host: Log in / Host: Sign up). Nobody has signed up. Evidence: 2026-11-06-final-S2-nav-d1-17e.png.
- QA-tooling note: RN header controls have no accessibility labels, so coordinate taps from the Codex tool fail. Minor; not fixed today.
