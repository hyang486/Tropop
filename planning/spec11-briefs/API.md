# Spec 11 server API (migration 0031)

Status: written and passing locally (PGlite). NOT applied to live; live apply needs human approval. Clients may code against this.
All RPCs need a signed-in user (42501 otherwise). Errors: PT409 conflict, PT422 limit, 22023 bad input, 42501 not allowed.

## B. Capacity
- `rooms.max_members` (2..30, default 30), `rooms.no_limit` (display flag: host chose "No limit"; the real cap is still 30).
- The server enforces only the hard cap 30. The Free cap of 6 is chosen and checked by the client.
- `join_room` / `join_open_room` on a full room: PT409 "This room is full."

## D. Open chat (public rooms)
- `create_room(...)` gains `p_max_members int, p_no_limit bool, p_visibility 'public'|'private' (default private), p_public_icon text ([a-z0-9-]{1,30}), p_public_location text (1..60)`. Pass arguments by name. Public needs icon and location; private must not have them.
- Limit: 5 public rooms per person per rolling 24 h, else PT422 "You can create up to 5 public rooms per day."
- `list_open_rooms(p_limit int default 50)` -> rows `{room_id, name, type, public_icon, public_location, member_count, max_members, expires_at, already_member}`. Open, not full, newest first, limit 1..100.
- `join_open_room(p_room_id uuid)` -> uuid (room id). Joins a public room without a code. Full: PT409.
- `rooms` read stays members-only; use `list_open_rooms` to browse.

## C. Question cards
- Table `question_cards` (read by the asker or answerer only, only while the room is open): `id, room_id, asker_id, answerer_id, question (1..500), answer, status pending|answered|asked_in_chat, created_at, timeout_at (+3 min), answered_at, posted_as_notice`.
- Cards are created by the qrewing Edge Function (service role); clients never insert. Realtime: broadcast `{table, op, id}` on `room:<id>`.
- `answer_question_card(p_card_id, p_answer (1..2000), p_post_as_notice bool default false)` -> card. Answerer only. Already answered: returns the card. After the chat move: PT409. Notice text max 1000 (22023).
- `ask_question_in_chat(p_card_id)` -> card. Asker only. Allowed after `timeout_at`; before it: 22023 "Wait for the answer a little longer."; already answered: PT409.
- `set_room_notice(p_room_id, p_text)` -> room. Host only. Text max 1000. Fields: `rooms.notice_text, notice_set_at, notice_set_by`.

## qrewing `ask` (C)
When the model lacks the answer it sets `needs_human`; the function then creates a card for the member it named (who spoke in the chat), else the host, never the asker, and replies `200 {answer, usage, card: {id, answererName, timeoutAt}}`. `answer` is a fixed sentence ("I asked <name> for you…", Korean for a Korean question). The asker reads the answer later from `question_cards` (RLS). If the host asks with nobody else to ask, or the insert fails, the reply is the plain answer with no `card`.

## A1 default avatars
`profiles.avatar_path` may be `default:<key>` (`[a-z0-9-]{1,30}`): a bundled picture, no Storage object, no cleanup job. Clients render unknown keys as the initial. Keys shipped as placeholders: star, moon, sun, flower, note, peak, gem, leaf.
