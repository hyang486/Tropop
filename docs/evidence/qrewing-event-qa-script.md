# Qrewing event room: simulator QA script

For: qa. Owner: developer-event. Run this only after (1) the human applies migration 0027 on the live server,
(2) `database.types.ts` is regenerated and 6c lands, and (3) a rebuild that includes `qrewing-event` is on the
simulators. Each step names the expected copy word for word (from `mobile/src/features/event/strings.ts` and
`mobile/src/i18n/en.ts`). Mark each step PASS / FAIL / NOT VERIFIED in `docs/evidence/qa-log.md` with a screenshot.

## Accounts and simulators

| Role | Sim | Account |
|---|---|---|
| Host | 17 Pro 91F3BFB3 | Simulator_host (standing host; never delete) |
| Guest A | guest sim 1 | existing guest account |
| Guest B | guest sim 2 | existing guest account (the "other member") |

Use only existing accounts (no new live accounts without the human's approval). Before every install, check the
app ID and keychain group (host 9K6BKSS4U6, guests FAKETEAMID build).

## 1. Create with Qrewing AI on and entry required (Host)

1. Rooms → Create room. Pick **3 hours** (the shortest option).
2. Turn on the **Qrewing AI** switch. Hint: "Qrewing flags important messages, suggests people to meet and writes a
   recap when the room ends. Each member decides whether their messages are included."
3. Turn on **Ask attendees for entry info**. Hint: "Attendees fill in a short intro (what they do, interests,
   links) before they chat."
4. Create. Expected: the room opens, no "Qrewing AI could not be turned on" error. On that error, record it with a
   screenshot. Expected error copy: "The room was created, but Qrewing AI could not be turned on. You can try again from Room info."
5. The host sees the disclosure sheet "Qrewing AI is on in this room" → **Agree**.

## 2. Guest entry form (Guest A, then Guest B)

1. Join by code. Disclosure sheet "Qrewing AI is on in this room" with **Agree** / **Not now**. Guest A: Agree.
   Guest B: Agree (Guest B tries Not now later in step 3.6).
2. Entry gate: "Introduce yourself", intro "The host asks attendees for a short intro. Everyone in this room can see
   it, and it is deleted when the room ends."
3. Save with an empty headline → "Add a headline."
4. Enter a link `http://x.com` → "Each link must start with https:// and be up to 200 characters."
5. Fill Headline / Interests / Looking for (different topics for A and B), one valid `https://` link → **Save** →
   chat opens.
6. Room info → Qrewing AI section shows "Your messages are included" and **Edit my entry info**.

7. B1 device check (73b532d), on a guest who has not joined yet (or Guest B in a fresh room): when the disclosure
   sheet appears, **swipe it down** without tapping Agree or Not now. Expected: the sheet closes, the chat area
   shows the entry gate (not the message list), and there is no composer (no text field or Send). Tapping the
   gate's button opens "Introduce yourself". The Mute small talk bar is not shown. FAIL if the message list or
   composer is usable before Save.

## 3. Mute small talk and important messages

1. Guest A: turn on **Mute small talk** → "Showing important messages".
2. Guest B posts 3 small-talk lines ("hi", "lol", "coffee?"). Guest A sees "3 messages hidden · Show"; tapping
   Show reveals them.
3. Host posts any line. Guest A sees it (host messages always show) and a banner "Important: …" with **Dismiss** (✕).
4. Guest B posts "@everyone doors open in 5". Guest A sees it plus an "Important: …" banner.
5. Guest B posts "@<Guest A display name> meet at the stage". Guest A (named): banner **"You were mentioned"**.
   Run step 1 on the host too, then confirm the host gets no "You were mentioned" banner.
   (A name without "@" is not a mention, by design.)
6. Optional: on a member who chose Not now, turning on Mute opens the "Qrewing AI is on in this room" sheet first.
7. If the AI is down: "Qrewing is not available right now. All messages are shown." Record it with a screenshot.
   It is not a failure of this step.

8. B2 device check (73b532d): no alert from old messages after a failed first load.
   Setup: Guest A has Mute small talk on; Guest B and the host have posted an "@<Guest A name>" line and an
   @everyone line. Guest A leaves the room screen.
   - Making the first load fail needs a network cut on Guest A only. There is no guest-only cut on the simulators
     without admin rights or a Mac-wide change (see CURRENT_STATE). Do not turn off the Mac's network unless the
     human approves it through supervisor. Without approval, record "B2 device: NOT VERIFIED (no guest-only network
     cut); covered by the nextLoadedOnce unit tests".
   - If approved: cut the network, open the room on Guest A (chat shows the load error and Try again), restore the
     network, tap Try again. Expected: the old lines load with no "You were mentioned" or "Important: …" banner
     and no buzz. Then Guest B posts a new "@<Guest A name>" line, and Guest A gets "You were mentioned".
     FAIL if a banner appears for a line older than the reconnect.

## 4. People to meet (Guest A)

1. Room info → **People to meet**. First open: "Qrewing is reading entry info…".
2. While the server returns 202 pending: "Qrewing is still finding people to meet." After the client stops
   polling: "Qrewing is still finding people to meet. Tap Refresh to check again."
3. **Refresh** → a list with Guest B's name (read as a header by VoiceOver), headline, a reason, and the link (tap
   opens Safari).
4. Tap Refresh again at once → the last list plus "Showing the last list. A new one is available in a few minutes."
5. Guest with no entry info (if available): "Add your entry info first so Qrewing knows who to suggest."

## 5. Recap (supervisor ruling: no live DB edit)

The shortest room is 3 hours. Main route (c): the host's early end in step 6. end-confirm runs `end_room` and
then requests the recap right away (`recapAfterEnd`), so recap, grace and R7 are covered without waiting.
The 60/10-minute scheduled triggers are covered by the `recapStep` unit tests (`tests/recap-plan.test.mjs`).

Expected recap (after step 6.1): the room-ended screen shows **Recap** with title (header), summary, bullet
highlights, "You in this room" (e.g. "3 messages sent", "Arrived at 7:42 PM") and "Saved on this phone only."
If none is saved: "No recap was saved for this room."

Optional (a), only if time allows: keep a 3-hour room open and stay in it at ≤ 60 min left (one recap request, no
visible change) and at ≤ 10 min left (one refresh). After the end, the same Recap card shows.

## 6. Host ends early → grace (main recap route)

Use the step-1 room.
1. Host: Room info → End room. The confirmation copy is "Chat closes now. The recap and photos stay available for 30 minutes, then
   messages, photos and files are deleted from the server. Anything already saved to a phone stays there." and the effects
   line "Closes now · Deleted after 30 min". With AI off, the copy names only photos: "Chat closes now. Photos stay available
   for 30 minutes, …".
2. All three sims: the room-ended screen "This room has ended", "<room> closed at <time>.", buttons **Photos of me**,
   **Photos & files**, **Back to rooms**. The Recap card shows "Qrewing is still writing the recap." with
   **Try again**, then the recap.
3. Rooms list: the row reads "Ended · recap and photos until <time>" (end + 30 min). Tapping it opens the
   room-ended screen, not chat.
4. Photos & files: viewing and downloading work. Any write (send, upload) is blocked with "This room has ended.
   Only viewing and downloads still work."
5. Photos of me without enrollment: "Photos of me was not set up before the room ended."
6. Pace stops on End (after the pace merge, sports room): a guest has the pace maker running on the Map tab with
   voice cues on. The host taps End. Expected: within a few seconds the guest's map switches to "This room has
   ended" and the voice stops. If the voice keeps playing, that is a FAIL.

## 7. R7: room channel in grace

On Guest A, stay on the room-ended screen from step 6.2 while the recap is still pending.
Expected: when the server finishes, the Recap card changes from "Qrewing is still writing the recap." to the
recap **without** leaving the screen or tapping Try again. That proves the room channel reached SUBSCRIBED under the
grace RLS policy and the `room_recaps` notice arrived. With Metro attached (port 8092), a realtime
CHANNEL_ERROR in the log is a FAIL. If the card changes only after Try again, record "R7 FAIL: no live notice".

## 8. Grace end → Room ended

Wait past end + 30 min (leave Guest A on the room-ended screen).
Expected: at the grace time the screen switches by itself to the plain ended state (Photos of me and Photos & files
buttons gone, **Back to rooms** only). The Rooms list row disappears. Opening the room by code → "This room has
ended." / "It expired, was ended by the host, or you left it." The saved recap stays on that phone.

## 9. Dark mode and VoiceOver spot checks

- Dark mode (Settings → Developer → Dark Appearance, or `xcrun simctl ui <udid> appearance dark`): repeat screens
  1.2, 2.2, 3.3 (banner), 4.3, 6.2 and the Recap card. No black-on-black or white-on-white text. Switches and
  spinners use system colors.
- VoiceOver (Accessibility Inspector on the sim is enough): entry fields read their label ("Headline", "Links
  (optional, up to 3) 1"); Mute switch reads "Mute small talk"; banner ✕ reads "Dismiss"; People names and the
  recap title read as headers; recap highlights do not read "bullet"; "Qrewing is still writing the recap." is
  announced when it appears.
- Largest Dynamic Type: skipped (human decision).
