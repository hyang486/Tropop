# Qrewing privacy and App Store notes (DRAFT)

Draft for the human, 2026-11-12. Nothing here has been submitted, and none of it is policy. It describes what the code on main `b9d031c` does. Each claim cites the code. **UNVERIFIED** marks anything the code does not show. Paths: `fn/` = `supabase/functions/`, `mig/` = `supabase/migrations/`, `src/` = `mobile/src/`. `0027` = `mig/20261104000027_qrewing_ai.sql`.

## 1. Data sent to third parties, by feature

All Claude calls go through one Edge Function, `fn/qrewing/index.ts` (Anthropic SDK, `index.ts:7`, `:20-31`). Without the `ANTHROPIC_API_KEY` secret, every action returns 503 `ai_not_configured` (`index.ts:420-422`, `fn/qrewing/core.ts:235`).

Every call checks four gates (`core.ts:230-243`):
1. the user is signed in;
2. the room is open (during grace, only the recap is allowed);
3. the caller is a member;
4. the host turned AI on.

Prompts carry display names and the listed text only. They never carry user ids, emails, coordinates or entry links as fields (`fn/qrewing/prompts.ts:2`), but chat text is sent as written, so a URL or email typed in chat does reach the model. They never include images (`prompts.ts:122-180`). The server keeps token counts only, in `private.qrewing_usage`, with no content and no foreign key, so a row can outlive its room (0027 `log_qrewing_usage`, lines 118-130 and 272-280).

| Feature | Sent to | Fields | Trigger | Model |
|---|---|---|---|---|
| Chat triage ("Mute small talk") | Anthropic | Room name; sender display name (no length cap, `core.ts:447`); whether the sender is the host; message text (500 characters); up to 3 earlier messages from members who agreed (200 characters each) (`core.ts:438-455`, `prompts.ts:122-133`) | `triageMessages`, at most 5 ids per call (`src/features/event/qrewing-api.ts:47-48`, `use-small-talk.ts:90`). Only for a caller who agreed and turned mute on (`core.ts:305`). A rule prefilter runs first for every sender and makes no model call: host messages, @all/@everyone/@here and announcement words are marked important; emoji-only messages and short acks or laughs are marked small talk (`core.ts:335-336`, `418-429`). The model runs only on what the rules leave, and only if the sender agreed; the rest are skipped (`core.ts:337-338`). At most 300 model calls per room per day (`core.ts:27`). | `claude-haiku-5-5` (`prompts.ts:6`) |
| People to meet | Anthropic | Display name (40 characters), headline (80), interests (160), looking for (160), for the caller and up to 29 other members who agreed. Others are labelled p1, p2 and so on; links are not sent (`core.ts:34-37`, `721-739`, `prompts.ts:172-180`) | `requestMatches` (`qrewing-api.ts:69-70`, `people-screen.tsx:34`). The caller must have agreed and saved entry info (`core.ts:636`). | `claude-sonnet-5-5` (`prompts.ts:8`) |
| Recap | Anthropic | Room name, type, place name and start time; photo and video counts only; the latest 150 messages from members who agreed, as display name (40) and text (200). A refresh sends the previous recap and up to 50 newer messages (`core.ts:33`, `526-545`, `566-610`, `prompts.ts:145-155`) | At 60 minutes left, and a refresh in the last 10 minutes (`src/features/recap/use-recap-triggers.ts:9-28`). The host's End, right after `end_room` (`recap-store.ts:145-154`). The host can request a recap any time while the room is open, and the server allows a recap during grace; other members get `too_early` before the last 60 minutes (`core.ts:503-505`). A copy is also kept on the phone (AsyncStorage `qrewing.recap.v1.<roomId>`, `recap-store.ts:1-3`, `106`), plus once-per-device `qrewing.recap-mark.v1.<roomId>` flags with no content (`recap-plan.ts:5`, `recap-store.ts:41-51`). Triage results and matches are kept in memory only. | `claude-sonnet-5-5` (`prompts.ts:7`) |
| Entry info | Supabase; Anthropic only through People to meet | Headline (1-80 characters), interests (300), looking_for (300), up to 3 https links (0027 lines 53-63). Every room member can read it (0027 `entry_profiles_select`, 163-165). Links are never fetched (0027 line 40). | `upsert_entry_profile` (`src/features/event/entry-api.ts:29`) | — |
| Face match / Photos of me | AWS Rekognition `CompareFaces`, not Anthropic | The reference photo and a temporary detection copy of each room photo, sent as image bytes (`fn/face-match/rekognition.ts:48-68`). The detection copy is about 1920 px and re-encoded, which drops EXIF/GPS (`fn/face-match/core.ts:62-97`, `fn/_shared/detect.ts:1-5`, `src/lib/face.ts:149-165`). Photos only, not videos (`fn/face-match/index.ts:111`). No face collection is created (`docs/plan/implementation-plan.md:20`). | Only the enrolled member's own app, for their own jobs (`fn/face-match/index.ts:3`, `9`, `67-80`). The server returns 503 unless `FACE_MATCH_ENABLED === 'true'` (`index.ts:55`). | — |
| Pace maker | Nothing sent | Sessions are stored on the phone only (AsyncStorage `qrewing.pace.v1.*`, `src/features/pace/storage.ts:5-55`): start time, duration, distance, average pace and splits. No coordinates are stored (`pace-core.ts:9-22`). `features/pace` makes no network calls. | Reads my own `live_presence` row while I share location (`pace-layer.tsx:55-75`) | — |
| Location sharing | Supabase only | lat, lng, speed, accuracy and heading, through `report_location` (`src/lib/location.ts:427-434`). High accuracy, at most every 5 s or 10 m (`location.ts:506-510`), only while the app is active (`location.ts:383-395`). Stored in `live_presence` (`mig/20261104000001_core_schema.sql:97-107`). The host's route is saved through `set_route` (`location.ts:178`). | The member opts in during an activity | — |
| Voice cues | On device | `expo-speech` `speak(text, {language:'en-US'})`; vibration if the native module is missing (`src/features/pace/voice.ts:6-42`). No network call in the app. Whether the iOS speech engine uses the network is **UNVERIFIED**. | Pace cues | — |

## 2. Consent and how a member declines

### Host switch

`qrewing_rooms.ai_enabled` defaults to false. `entry_required` defaults to false and needs AI on (0027:21-27). Only the host can change either, through `set_qrewing_room`, and entry info can be required only in an event room (0027:176-200).
- UI: the create-room switch, default off (`src/app/create-room.tsx:51`, `170-173`, `298`), and Room info (`src/features/event/info-section.tsx:60-77`).

### Member consent

`qrewing_members.ai_ok_at`: null means no consent, and a member without a row has not consented. `mute_small_talk` defaults to false and needs consent (0027:29-38). A member can read only their own row (0027:161-162).
- The RPC `set_qrewing_member` allows agreeing only while the room has AI on. Withdrawing is always allowed; it clears `ai_ok_at` and turns mute off (0027:202-232).
- **Consent point:** the first open of an AI room shows a disclosure sheet with Agree / Not now (`src/features/event/disclosure-sheet.tsx:13-44`). Both answers are saved. Swiping the sheet away saves nothing, so it shows again on the next open. The copy names Anthropic's Claude and says what is excluded, deletion at room end, and what Not now means (`src/i18n/en.ts:643-652`).
- **Withdrawing later:** Room info → "Stop including my messages" (`info-section.tsx:84-91`, `en.ts:683-686`).

**When a member declines:**
- Their messages are left out of triage targets and context (`core.ts:337`, `439`) and out of the recap and refresh (`core.ts:524-528`, `576-578`).
- Their entry is left out of other members' match candidates (`core.ts:654`, `724`), and they cannot request matches of their own (`core.ts:636`).
- Rule-based triage, which makes no model call, still runs on their messages, as it does for every sender (`core.ts:335`).
- Their entry info stays visible to members.
- Withdrawing affects only future calls. A recap already written, and existing triage rows, keep content derived from their earlier messages until the room is deleted.

### Face match consent

- **Consent screen:** five points that name Amazon Rekognition (`en.ts:221-227`).
- **Enrol:** the reference photo is uploaded to `face-refs/{room}/{user}/` and `enroll_face` is called (`src/lib/face.ts:64-74`; `mig/…0002` line 656, `mig/…0012` line 33).
- **Stop and remove:** `remove_face_enrollment` (`face.ts:89`; 0002:681; `en.ts:238-241`) deletes the enrollment. Its matches and jobs cascade with it (`core_schema.sql:146-177`), and the trigger `on_face_enrollment_deleted` queues the `face-refs` folder for cleanup (0002:195-204).
- **Live `FACE_MATCH_ENABLED` value:** **UNVERIFIED** from code. `docs/CURRENT_STATE.md:80` records it ON as of 2026-11-09.

## 3. Retention and deletion

**Expiry.** `expires_at` is required and must be 5 minutes to 7 days ahead (`core_schema.sql:19`; 0002:272, 423). Reads are denied at read time: `private.is_room_member` and `room_is_open` require `deleted_at is null and expires_at > now()` (0002:24-45), and every 0027 policy goes through them (0027:14-15). There is no grace after expiry (0027:310).

**The host's early end.** `end_room` sets `deleted_at = now()` and `grace_until = now() + 30 minutes` (0027:315-328). For those 30 minutes members can only read (`is_grace_member`, 0027:301-365):
- readable: their own room and membership rows, media rows, `room-media` originals and previews, their own face enrollments and matches, and `room_recaps`;
- not readable: messages, the member list, locations, statuses, emergencies, triage, matches and entry profiles (0027:309).

The only model call allowed during grace is the recap (`core.ts:226-239`). The confirm copy says this (`en.ts:527-538`), and so does the grace screen (`en.ts:733-734`).

**room-janitor.** pg_cron runs it every 5 minutes (0027:425; pg_cron in `mig/…0013:7`; pg_net call with a secret header, 0013:26-41). It deletes:
- rooms that are expired or ended, with no grace or with grace over (`fn/room-janitor/core.ts:45-50`, `index.ts:37-48`). All 0027 tables cascade (0027:12-13).
- the `room-media/{room}/` and `face-refs/{room}/` folders queued by `on_room_deleted` (0002:206-214), then checks they are empty (`core.ts:79-106`);
- orphaned `face-refs` objects older than 1 hour (`core.ts:108-118`);
- detection copies older than 15 minutes (`core.ts:120-128`). Detection copies are also deleted right after use (`fn/face-match/core.ts:76-82`).

It never calls AWS (`fn/room-janitor/index.ts:3`).

**Account deletion.** `fn/delete-account/index.ts:33` calls `prepare_account_deletion` (`mig/…0021:75-109`). It:
- ends the rooms the user hosts by setting `deleted_at` only, with **no 30-minute grace** (0021:88-89; 0027:311);
- queues the user's media folders in other rooms, and their avatar, for cleanup;
- turns off their location sharing and deletes their live position.

Then `auth.admin.deleteUser` (`index.ts:39`) cascades through their data. Messages they sent in other rooms stay, with `sender_id` set to null (0021:15-19).

**Third-party retention:**
- **Anthropic:** how long Anthropic keeps API inputs and outputs is **UNVERIFIED**. Neither the code nor the docs cover it. The disclosure's "Qrew deletes them … when the room ends" (`en.ts:648`) covers Qrew's copies only.
- **AWS Rekognition:** retention is not claimed. AWS may keep submitted images (`planning/USER_DECISIONS_2026-11-04_NOTIFICATIONS_EN.md:18-20`; `docs/plan/implementation-plan.md:20`).

## 4. Draft App Store privacy label answers

Draft only. The human decides the final answers. "Linked" means linked to the account's Supabase user id. Tracking is "No" for every type: the code has no analytics, advertising or crash SDK (`mobile/package.json`) and does not share data with data brokers.

| Data type | Collected? | Purpose (Apple category) | Linked | Basis |
|---|---|---|---|---|
| Name | Yes: display name | App Functionality | Yes | `src/lib/auth.tsx:146-170` |
| Email address | Yes, for hosts (email and password) | App Functionality | Yes | `auth.tsx:146-170` |
| Precise location | Yes, opt-in, while in use only | App Functionality | Yes | `app.json:74-83`, `location.ts:427-434` |
| Photos or videos | Yes, items the user shares to a room | App Functionality | Yes | `src/lib/media.ts:108-117` |
| Other user content | Yes: chat, entry info, recaps, profile photo | App Functionality | Yes | 0027:53-63; `mig/…0021` header |
| Biometric data (face) | Probably yes: the face reference photo is compared by AWS. The human should decide this category. | App Functionality | Yes | `fn/face-match/rekognition.ts:48-68` |
| User ID | Yes: Supabase user UUID | App Functionality | Yes | `auth.tsx` |
| Fitness | No: pace stays on the phone | — | — | `pace/storage.ts:5-55` |
| Contacts, browsing, search, purchases, diagnostics, device ID for ads | No | — | — | `mobile/package.json` |

Other points:
- No background location (`app.json:79-81`).
- Remote push is disabled and no token is registered (`app.json:69-72`; `register_push_token` appears only in `src/lib/database.types.ts:1011`).
- Whether location metadata stays inside uploaded original photos is **UNVERIFIED**. The picker passes originals through with `exif:false` (`media.ts:108-117`).
- The privacy policy URL is **UNVERIFIED**: no policy URL exists in the repo.

## 5. Draft App Review notes

> Qrew creates temporary group rooms (QR or 5-digit code). Room content is deleted from our servers when the room expires, or 30 minutes after the host ends it. AI features ("Qrewing") are off by default per room. When the host turns them on, each member sees a disclosure naming Anthropic's Claude and chooses Agree or Not now. Only agreeing members' text is sent. Face matching ("Photos of me") is opt-in per member with its own consent screen, and uses Amazon Rekognition CompareFaces. The pace maker runs on the device. Location is shared only while the app is open and the member has opted in during an activity.

### Reviewer test path

This path uses the existing demo accounts only. `docs/DEMO.md:16-17` lists host "Test" and guest "Test joiner". Passwords are not in the repo, so the human supplies the review credentials. No reviewer-ready account exists yet; it is **UNVERIFIED** whether to reuse the QA accounts.
1. Sign in as the host. Create a room with Qrewing AI on (create-room switch).
2. Join from a second device by code or QR as a guest, or with "Test joiner". Show the disclosure sheet: Agree / Not now.
3. Chat, then try Mute small talk and People to meet (entry info required).
4. Start an activity, opt in to location sharing, and turn on the Pace maker on the Map screen.
5. Optional: open Photos of me, go through the consent screen, and add a reference photo. This needs `FACE_MATCH_ENABLED` on the server.
6. The host ends the room. The recap and photos stay readable for 30 minutes; chat closes now.

Scripted walkthroughs: `docs/evidence/qrewing-demo-scenario.md` and `docs/evidence/qrewing-event-qa-script.md:8-17`. A real model call has not been verified end to end yet (`docs/CURRENT_STATE.md:66-69`).
