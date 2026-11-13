# Presentation video plan (re-record of the two final scenarios)

A presentation-style re-record of qa's final 5-sim E2E (scenario 1 "Sunset Run Club", scenario 2 "Founders Coffee Night"; codex-final-qa-live-status.md, 2026-11-12 23:11 to 2026-11-13 00:13). The order follows the two stories, and the fixed E2E items appear on camera. Target: about 4 min 15 s.

Test personas and sims (same as the E2E): **Mina** host, 17 Pro · **Jun** 17 · **Sora** 17e (dark mode) · **Leo** Pro Max · **Dani** iOS 27.2 (Siri). Test data only: consented photos from `face_recognition_test/`, no real people.

Before recording: main includes 2f6b7e6 (client fixes i/j/c) and 66c057a (Ask/recap fixes a/b/g/h), and qrewing v7 is live. Create new rooms; none of the earlier rooms are open. Use stepped `simctl location set` on the 27.2 sim (playback stops after about 1 min).

## Part 1: Sunset Run Club (sports), about 2 min 30 s

| # | Sim / person | Action | Hold on (on-screen result) | Caption | Time |
|---|---|---|---|---|---|
| 1 | Mina, light | Create room → type Sports → turn on Qrewing AI; scroll so the AI switch sits right above the bar | Hairline at the scroll edge and the clear gap above **Create room**; the switch is not under the button (fix i) | "Room settings never hide under the Create button." | 15 s |
| 2 | Sora, dark | Same Create room screen in dark mode (no need to create) | The separator is visible in dark and the gap matches (fix i, dark) | "Same clear edge in dark mode." | 8 s |
| 3 | Mina | Tap Create room → invite code shows | 5-digit code and QR | "Start a temporary room in seconds." | 8 s |
| 4 | Jun, Sora, Leo, Dani (4-up) | Join by code, accept AI consent | Each lands in the chat | "Friends join by code or QR, no sign-up." | 12 s |
| 5 | Dani | Map → Pace maker on → Target → Target pace | Field prefilled with Dani's usual pace, or empty under the muted "e.g. 5:30" hint with Save disabled and "Enter a target pace to save it." (fix j) | "Your target starts from your usual pace." | 12 s |
| 6 | Jun, Sora, Leo, Dani | Tap **Arrived** | "X arrived" notices in the chat | "Arrivals show up for everyone." | 8 s |
| 7 | Mina | Info | "5 people · 4 arrived" | — | 5 s |
| 8 | Mina | Map → End activity → Start activity → Info | Still "5 people · 4 arrived"; each Arrived chip still reads "Arrived at …" (fix c) | "Arrivals count for the meetup, not each activity." | 15 s |
| 9 | All (5-up) | Run 2-2-1: Mina+Jun ahead, Sora+Leo middle, Dani behind | Map groups "Mina · Jun" vs "Sora · Leo"; Dani's cue "Lead group … meters ahead…" | "Pace cues keep the group together." | 20 s |
| 10 | Leo | Status → Emergency → confirm | Red banner on the others' sims; Mina taps "I see it" → "Seen by Mina", then resolved | "Emergency reaches everyone at once." | 15 s |
| 11 | Dani (still running) | Q → Ask "Where is the lead group and am I moving?" | The answer says Dani is moving, names the lead group (Mina, Jun) and the gap, and calls Dani "you" (fixes b, h) | "Ask Qrewing knows where the group is." | 15 s |
| 12 | Sora | Q → Ask "Did anyone have an emergency?" | The answer names Leo's Emergency and that it was resolved (fix a) | "It remembers what happened in the room." | 10 s |
| 13 | Mina | End activity → End room → recap | The recap has pace lines and mentions the Emergency (fix a); grace 30 min note | "A recap when the room ends; data is deleted after." | 12 s |

## Part 2: Founders Coffee Night (event), about 1 min 40 s

| # | Sim / person | Action | Hold on (on-screen result) | Caption | Time |
|---|---|---|---|---|---|
| 14 | Mina | Create Event room, AI + entry info on, mark "Looking for" required | Question editor with the red * and the Required switch | "Hosts choose what guests share." | 12 s |
| 15 | Jun | Join → Save with "Headline" empty, then fill it | Inline error "Answer "Headline"." then saved | "Required answers are checked in place." | 10 s |
| 16 | Jun | People to meet | Sora and Leo with their reasons | "Qrewing suggests who to meet." | 12 s |
| 17 | Sora (dark) | Mute small talk on; others send small talk plus Leo's "cafe closes at 1 AM…" | "2 messages hidden · Show" and the Announcement kept | "Mute small talk, keep what matters." | 15 s |
| 18 | Mina | Send a host message | "Important: From the host" banner on guests | — | 6 s |
| 19 | Leo | Send "talk starts in 10 minutes" at time T; a few minutes later Q → Ask "When does the talk start?" | The answer uses the message's posted time (for example "about 5 minutes from now"), not the ask time, and refers to Leo's own message as "you posted" (fixes g, h) | "Answers use when things were said." | 15 s |
| 20 | Mina | Upload 4 group photos; each guest opens **Me** | Each guest sees only photos of themselves | "Photos of me, matched only in this room." | 15 s |
| 21 | Dani (27.2) | Siri: "Ask Qrew …" | The spoken or on-screen answer | "Ask hands-free with Siri." | 8 s |
| 22 | Mina | End room → recap → grace | Recap screen and the deletion note | "When it ends, it's really gone." | 7 s |

Total about 4 min 15 s (Part 1 2:35, Part 2 1:40).

## Notes for the recorder

- Hold each "Hold on" frame for at least 2 s before the next action; captions go in the edit, not on device.
- Scenes 1-2 and 5 need no other sims; record them first while the rest join.
- If an Ask answer differs in wording, keep it as long as the fixed point (moving, lead group, relative time, "you", Emergency) is visible.
- Not shown: per-photo delete (d, not built) and older small talk staying visible after mute (f, by design).
