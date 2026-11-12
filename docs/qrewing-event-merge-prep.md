# Qrewing event: merge prep (queue item 6)

Owner: developer-event. Branch `qrewing-event`. Written 2026-11-12 at `45915ba`. Nothing here was applied to main.

## 6a. Trial merge (throwaway branch, deleted)

- Base: `main` at `ed5a281`. `main` is already an ancestor of `qrewing-event` (merge-base = `ed5a281`), so merging main into event is "Already up to date". There are **0 conflicts**.
- Extra check: the branch stacked event + `qrewing-pace` (`ff64b2c`) + `qrewing-backend` (`8544792`) in a scratch worktree. It also had **0 textual conflicts**. On the stacked tree: `tsc --noEmit` 0 and `npm test` 398/398.
- File overlap: event and pace share no file, and neither do event and backend. Event changes 32 files (only under `mobile/`). Pace changes 20 (`features/pace`, `map.tsx`, `status-picker.tsx`, tests). Backend changes 14 (`supabase/`, docs, scripts, and `mobile/package.json` + `package-lock.json`).
- Shared files event touches, which only event changes: `mobile/src/app/create-room.tsx`, `mobile/src/app/index.tsx` (room list), `mobile/src/app/room/[id]/index.tsx`, `.../gallery.tsx`, `.../media/[mediaId].tsx`, `.../info.tsx`, and `mobile/src/components/end-confirm.tsx`, `photos-of-me.tsx`, `room-ended.tsx`. `mobile/src/i18n/en.ts` is untouched (the strings stay in `strings.ts` until 6b).
- Risk is in meaning, not in text. `mobile/package.json` changes only on backend, so check after the merge that `npm test` still picks up the event and pace test files.
- Throwaway branch `trial-merge-event-6a` and its worktree were removed.

## 6b. `features/event/strings.ts` → `en.ts` (event first, pace after)

Target: one new section, `en.qrewing`, keeping the keys as they are. Replace `eventStrings` with `en.qrewing` in the importers and delete `strings.ts`. `en` has no `qrewing` key today.

| strings.ts section | Keys | Target | Collision with en.ts |
|---|---|---|---|
| `create` | aiLabel, aiHint, entryLabel, entryHint, aiSaveFailed | `en.qrewing.create` | none (`en.createRoom` is separate) |
| `disclosure` | title, body[], agree, notNow, failed | `en.qrewing.disclosure` | none |
| `entry` | title, intro, headline, headlinePlaceholder, interests, interestsPlaceholder, lookingFor, lookingForPlaceholder, links, linkPlaceholder, linksNote, save, saved, headlineRequired, headlineTooLong, tooLong, linkInvalid, tooManyLinks, loadFailed, saveFailed, retry | `en.qrewing.entry` | none |
| `info` | section, consentOn, consentOff, agree, withdraw, editEntry, addEntry, peopleToMeet, loadFailed, saveFailed, retry | `en.qrewing.info` | none |
| `mute` | label, on, hidden, showAll, needsConsent, banner(), mentioned, dismiss, unavailable, saveFailed | `en.qrewing.mute` | none |
| `people` | title, refresh, loading, empty, noEntry, stale, pending, pendingFinal, updating, updatingFinal, updateFailed, failed, notConsented | `en.qrewing.people` | none |
| `recap` | title, none, pending, offline, retry, you, messages(), media(), photosOfMe(), arrived(), savedHere | `en.qrewing.recap` | none |
| `grace` | availableUntil(), closedNote, photosOfMe, photosAndFiles, listRow(), readOnly(), writeClosed, notSetUp | `en.qrewing.grace` | none |
| `errors` | ai_not_configured, ai_off, not_member, not_muted, no_entry, too_early, ai_failed, network | `en.qrewing.errors` | none inside `en.qrewing`. `en.errors` exists but shares no key; keep them apart, since a flat merge would mix contract codes into app errors |
| `endRoom` | deleted, effects, effectsLabel, deletedNoRecap, effectsLabelNoRecap | **into `en.endRoom`** (spec 7.4) | **yes**: `deleted`, `effects` and `effectsLabel` intentionally replace the en.endRoom values. `deletedNoRecap` and `effectsLabelNoRecap` are new keys. en.endRoom keeps title, body, confirm, keep and notHost |

`endRoom` steps:
1. Overwrite `en.endRoom.deleted/effects/effectsLabel` with the event copy and add the two `*NoRecap` keys.
2. Rewrite the comment above `en.endActivity` as described in the `strings.ts` header.
3. In `end-confirm.tsx`, drop the `{ ...en.endRoom, ...eventStrings.endRoom }` spread and read `en.endRoom` only.

Scheduled-end copy (expires_at, no grace) is unchanged.

Importers to switch (14): `app/create-room.tsx`, `app/index.tsx`, `app/room/[id]/gallery.tsx`, `app/room/[id]/index.tsx`, `components/end-confirm.tsx`, `components/photos-of-me.tsx`, `components/room-ended.tsx`, `features/event/{chat-layer,disclosure-sheet,entry-screen,info-section,people-screen}.tsx`, `features/recap/recap-card.tsx`. `strings.ts` itself is deleted. Tests do not import `strings.ts`.

### Pace (follows event; read-only view of `qrewing-pace` `features/pace/strings.ts`)

`paceStrings` is flat, with 28 keys: title, switchHint, needsSharing, needsActivity, target, targetUsual(), targetPace, targetTime, pacePlaceholder, distancePlaceholder, distanceLabel, timePlaceholder, timeLabel, perKm, save, saved, invalidPace, invalidTime, noTarget, recap(), stats(), cueKm(), cueSlow(), cueFast(), cueGap(), cueDismiss, stationaryTitle, dismiss.

- Recommended target: **`en.pace`**, a top-level section that is free in en.ts today.
- Do **not** flatten pace into `en.qrewing`. Pace's `recap()`, `save`/`saved` and `dismiss` names would sit next to `en.qrewing.recap` (an object) and other event keys. `en.qrewing.pace` would also work, but `en.pace` keeps the two features apart.
- Keep the module-level helper `km()` (used by pace functions) as a local helper next to `en.pace`, or move it into pace code.

## 6c. Hand-written DB types to replace after the 0027 apply and the type regeneration

The developer regenerates `mobile/src/lib/database.types.ts` after the live sitting. This branch does not edit that file. After regeneration, switch the following:

| Place | Hand-written type or cast | Switch to |
|---|---|---|
| `features/event/types.ts` 1.1–1.5 | `QrewingRoomRow`, `QrewingMemberRow`, `EntryProfileRow`, `MessageTriageRow`, `RoomRecapRow` | `Tables<'qrewing_rooms'>`, `Tables<'qrewing_members'>`, `Tables<'entry_profiles'>`, `Tables<'message_triage'>`, `Tables<'room_recaps'>`, kept as aliases so importers stay the same. Keep `QrewingError` and the 2.x response types (Edge Function contract, not DB) |
| `features/event/qrewing-api.ts:26`, `features/event/use-small-talk.ts:23`, `features/event/entry-api.ts:11`, `features/recap/recap-store.ts:31` | `const db = supabase as unknown as SupabaseClient` (untyped client, because the tables are not in the generated types yet) | Use the typed `supabase` directly. Remove `db` and the `.maybeSingle<Row>()` generics |
| `qrewing-api.ts:82, :91`, `entry-api.ts:32` | `db.rpc('set_qrewing_room' / 'set_qrewing_member' / 'upsert_entry_profile', …)` untyped | Typed `supabase.rpc`. The arg names `p_room_id`, `p_ai_enabled`, `p_entry_required`, `p_ai_ok`, `p_mute` and the entry fields get checked against the SQL |
| `qrewing-api.ts:114-116`, `qrewing-plan.ts:111-112` (`roomStateFrom`) | reads typed by `QrewingRoomRow`/`QrewingMemberRow` | Follow automatically through the aliases |
| `use-small-talk.ts:33` | `(data ?? []) as MessageTriageRow[]` | Drop the cast |
| `entry-api.ts:19, :28` | `.maybeSingle<EntryProfileRow>()`, `as EntryProfileRow[]` | Drop the generic and the cast |
| `recap-store.ts:132, :172` | `.maybeSingle<RoomRecapRow>()` | Drop the generic |
| `features/recap/grace-plan.ts:9-12` (TODO) | `GraceRoomFields.grace_until?: string \| null`, hand-written optional | Use `Pick<Tables<'rooms'>, 'deleted_at' \| 'expires_at' \| 'grace_until'>` and make it required |
| `features/recap/use-grace.ts:16-19`, `components/room-ended.tsx:25`, `app/index.tsx` (`roomListEntry(room, now)`) | read `room.grace_until` through `GraceRoomFields` | Follow from the grace-plan change. Check that `getRoom` / the room list `select` includes `grace_until` |

Check after the switch: `npx tsc --noEmit` should flag any name drift between the hand-written rows and the SQL (for example `ai_ok_at`, `mute_small_talk`, `entry_required`, `state` enum values `pending/done/failed`, `skipped` on message_triage). Then run `npm test`; the tests use plain objects and need no change.

### 6c applied on this branch (2026-11-12, supervisor assignment)

- `mobile/src/lib/database.types.ts`: generated from the live project after 0027 using the read-only Supabase MCP `generate_typescript_types`. The generator drops the earlier hand-written `| null` on the `preview_room` return (`place_lat`, `place_lng`, `place_name`, `starts_at`), so those four were put back. The only other change to existing types is that `media.created_at` moved to its alphabetical position. At merge, developer's file wins; diff it against this one.
- Done as in the table above, with two exceptions:
  - `message_triage.state` and `room_recaps.state` are `text` with a check constraint, so they generate as `string`. `MessageTriageRow` and `RoomRecapRow` keep the narrowed unions (`Omit<Tables<…>, 'state'> & {state: …}`). The `use-small-talk.ts` cast and the `recap-store.ts` `.maybeSingle<RoomRecapRow>()` generics stay for that reason.
  - `grace-plan.ts` imports `Tables` from `@/lib/database.types` instead of `Room` from `lib/rooms.ts`, which keeps the module free of React Native imports.

### 6c pre-check against qrewing-backend `686a69e` (read-only, 2026-11-12)

Backend changes no mobile client file (only `package.json`: `expo-speech`), so 6c touches only the event files above.

- DB columns vs the hand-written rows (migration 0027): `qrewing_rooms`, `qrewing_members` and `entry_profiles` match field for field. The SQL adds two columns the hand-written rows lack: `message_triage.source` (`'model' | 'rule'`) and `room_recaps.refreshed_at` (`string | null`). Through the `Tables<>` aliases they appear without code changes; no event code reads them. The `state` enums match: triage `pending/done/skipped`, recap `pending/done/failed`.
- RPCs: `set_qrewing_room(p_room_id, p_ai_enabled, p_entry_required)`, `set_qrewing_member(p_room_id, p_ai_ok, p_mute)` and `upsert_entry_profile(p_room_id, p_headline, p_interests, p_looking_for, p_links)` match the calls at `qrewing-api.ts:82, :91` and `entry-api.ts:32`.
- `rooms.grace_until timestamptz` is added. `lib/rooms.ts:91, :98` select `*`, so `Room` (`Tables<'rooms'>`, `lib/rooms.ts:11`) carries it after regeneration. `grace-plan.ts:12` then becomes `Pick<Room, 'deleted_at' | 'expires_at' | 'grace_until'>`, and `use-grace.ts:19` builds `expires_at: ''`, which still type-checks.
- Edge Function request bodies (`core.ts` `parseBody`) match `qrewing-api.ts:48, :53, :63-67, :75`: `probe {roomId?}`, `triage {roomId, messageIds 1-5}`, `recap {roomId, refresh?: boolean}`, `match {roomId}`.
- Responses match `types.ts` 2.x:
  - triage: `200 {results: [{messageId, state, important, reason}]}`.
  - recap: `200 {state: 'done', title, summary, highlights, generatedAt, cached}`, or `202 {state: 'pending'}`.
  - match: `200 {matches: [{userId, displayName, headline, reason, score}], cached, stale?, generatedAt}`, or `202 {state: 'pending'}`.
  - Errors: `400 bad_request` (maps to `ai_failed`), `503 ai_not_configured`, `403 not_member` / `ai_off` / `not_muted`, `409 no_entry` / `too_early`, `502 ai_failed`. All are covered by `QrewingError` and `classifyQrewingError`.
  - `too_early` also returns `availableAt`. The client does not read it, and this is not a 6c change.
- Grace (0027): the server's `recap` action and the `room_recaps` select policy stay reachable during grace. `message_triage`, `entry_profiles` and matches do not, which is consistent with the grace-plan screens.
- Result: no contract change is needed for 6c. It is the type switch in the table above only.

## 6d. Pace line in the recap (after the pace branch is in)

- `features/recap/recap-store.ts` `readMyPart` (line ~98, `pace: null` with the merge comment): set
  `pace: paceRecapLine(await getActivitySummary(roomId))`, importing both from `@/features/pace/summary`. Nothing else.
- No flush or await on pace internals: pace `2ba6451` (supervisor PASS) makes `getActivitySummary` count the
  in-memory run, so a recap read right after `end_room` still gets the line (cross-review F1). Do not edit pace files.
- `getActivitySummary` never rejects; `mergeMyPart` already keeps an earlier non-null pace.
- Check after: `npx tsc --noEmit`, `npm test`; device check is QA script step 5/6 (recap shows "Pace maker: …").

## Merge rulings from pace's cross-review (supervisor accepted)

- M1: the pace maker stays on the Map tab only. `PaceLayer` is not added to the chat screen (`app/room/[id]/index.tsx`).
- M2: en.ts order: event's `en.qrewing` and its overrides (6b step 2: `en.endRoom` copy) go in first, then pace's
  separate top-level `en.pace`. Do not flatten pace into `en.qrewing`.

## Open device items (not part of this unit)

- Dark mode on device: qa runs it after the single rebuild (f7baf8f was a code-only pass).
- R7: the grace realtime policy allows only event `room_recaps` on `realtime.messages`. `GraceRecapNotices` uses `useRoomEvents`, which listens to `*` and filters by `payload.table`. Check on a simulator, after live 0027, whether the private join with `*` passes. If it does not, listen to `room_recaps` explicitly. This is a qa item after the sitting.
