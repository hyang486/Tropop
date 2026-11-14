# Push readiness: local main 0ceda26 to GitHub QRew (2026-11-14)

Prep only. Nothing was pushed, fetched or pruned, and no ref was created or deleted while writing this. The push
waits for the human's explicit go.

## 1. What is on the remote, and the range

- Only one remote exists: `qrew` = `https://github.com/hyang486/QRew.git`. There is no `origin`.
- `git ls-remote --heads qrew` (read-only, no fetch): `refs/heads/main` = `d16e070d9afcc7ff0d87a1d1f027bfc5f37c4b89`.
  The local tracking ref `qrew/main` is the same commit.
- Remote history is a chain of snapshot commits (8147215 → 45a1ad9 → d16e070), not local main's history.
  `d16e070` is not an ancestor of `0ceda26`. Each snapshot tree is `.gitignore` + `README.md` (remote-only files)
  + `mobile/` + `supabase/` copied from a local main commit.
- `d16e070` = local `b5356c8` (2026-11-13, "Merge calendar-past-room"): `d16e070:mobile` and `d16e070:supabase` are
  byte-identical trees to `b5356c8:mobile` and `b5356c8:supabase`. Its `.gitignore` also matches 0ceda26's.
- Stale note: CURRENT_STATE says "Push snapshot 4 still not pushed". Snapshot 4 (45a1ad9) and d16e070 are both on
  `qrew/main`, so that line is out of date.

Range `b5356c8..0ceda26` (local main):

- 348 commits (300 non-merge).
- `mobile/` + `supabase/`: 242 files changed, +16230 / -1859. By area: `mobile/src` 135 (features 52, components 33,
  lib 29, app 20), `mobile/tests` 87, `mobile/app.json`, `mobile/package.json`, `mobile/package-lock.json`,
  `mobile/assets` 1, `supabase/migrations` 4, `supabase/rollback` 4, `supabase/tests` 4,
  `supabase/functions/qrewing` 4 (core.ts, index.ts, prompts.ts, qrewing.test.ts).
- Outside `mobile/` and `supabase/` (docs, planning, scripts): 16 files. These are not part of a snapshot.
- Work in the range: Spec 11 (capacity, open chat, question cards, user plans, room storage cap, room AI Plus),
  C14/C31/C34/C39/C42 QA fixes, test-only fillers, and the UX2 audit fixes:
  UX2-01 to 39, 41, 42, 43b, 44 to 75, 77c, 78 to 91, 93, 107 to 115, 118 to 120, 122 to 127, 129, 130, 131c,
  132 to 143 (from commit subjects: `git log --no-merges --format=%s b5356c8..0ceda26 | grep -oE 'UX2-[0-9]+[a-z]?'`).

## 2. Secrets check (tracked diff `b5356c8..0ceda26 -- mobile supabase`)

Commands run, and their results:

```sh
git diff --name-only b5356c8 0ceda26 -- mobile supabase \
  | grep -E '(^|/)\.env|\.pem$|\.p8$|\.p12$|\.key$|\.mobileprovision$|GoogleService|credentials'
# no output

git diff b5356c8 0ceda26 -- mobile supabase | grep -E '^\+' \
  | grep -nE 'sk_live|sk_test|sb_secret_|service_role|SUPABASE_SERVICE|eyJhbGciOi|AKIA[0-9A-Z]{16}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|ANTHROPIC_API_KEY *=|sk-ant-|ghp_[A-Za-z0-9]{20}|xox[bp]-'
# no output

git ls-tree -r --name-only 0ceda26 mobile supabase | grep -E '(^|/)\.env'
# mobile/.env.example only: two empty keys (EXPO_PUBLIC_SUPABASE_URL=, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=),
# unchanged from d16e070 (blob ea48bb9)
```

Result: clean. No env file, key file or token in the range.

## 3. Migrations in the range

Added in `b5356c8..0ceda26` (each has a rollback file and a pgTAP test in the range). Live list from
`list_migrations` on `wuhkyjksiiqzoxvonfuy` (read-only):

| File | Live version | Applied |
|---|---|---|
| `20261104000031_spec11_capacity_open_chat_question_cards.sql` | 20261114054841 | yes |
| `20261104000032_user_plans.sql` | 20261114061023 | yes |
| `20261104000033_room_storage_cap.sql` | 20261114081433 | yes |
| `20261104000035_room_ai_plus.sql` | 20261114094947 | yes |

- There is no 0034 file on main. The numbering skips it; nothing is missing live.
- `20261104000036_emergency_status_guard.sql` is only on `cc07110` (not main) and is not applied live. It is not in
  this push. It waits on the human (ADR 0036).
- 0030 (`one_day_room_reminder_window`) was already in d16e070.
- A GitHub push does not deploy anything. Not checked here: whether the deployed `qrewing` Edge Function matches
  `0ceda26:supabase/functions/qrewing`.

## 4. Command sequence for the human's go

Same model as earlier snapshots: one commit whose parent is `qrew/main`, human author, no Claude trailer, pushed to
`qrew` `main` as a fast-forward. Run from any worktree. Nothing touches the working tree or the index.

```sh
# 0. The remote tip must still be d16e070; stop if not.
git ls-remote --heads qrew main            # expect d16e070d9afcc7ff0d87a1d1f027bfc5f37c4b89

# 1. Tree: remote-only root files from d16e070 + mobile/ and supabase/ from 0ceda26.
T=$( { git ls-tree d16e070 .gitignore README.md; git ls-tree 0ceda26 mobile supabase; } | git mktree )

# 2. Checks before committing (dry-run on 2026-11-14 gave tree dd62afa, all three as expected; zsh needs ${T}).
git diff --stat d16e070 "$T" | tail -1     # expect 242 files changed, +16230 / -1859
git ls-tree "$T" | awk '{print $4}'         # expect .gitignore README.md mobile supabase
git diff --quiet "${T}:mobile" 0ceda26:mobile && git diff --quiet "${T}:supabase" 0ceda26:supabase && echo same

# 3. Commit (author: Hyeonmin Yang <didgusals970418@gmail.com> from git config; no Co-Authored-By line).
C=$(git commit-tree "$T" -p d16e070 -m "QRew: <one-line summary of the range>")
git branch qrew-push-snapshot-0ceda26 "$C"

# 4. Push on the human's go only: local snapshot branch -> qrew main, fast-forward (no --force).
git push qrew qrew-push-snapshot-0ceda26:main

# 5. Confirm.
git ls-remote --heads qrew main            # expect $C
```

The commit message summary is for the human or supervisor to write; the placeholder above must be replaced.

## 5. Known hazards (reported only, nothing deleted)

iCloud made duplicate files with a space and a number inside `.git` (`/Users/hyeonminyang/Desktop/IYA_Project/.git`).
Git warns "ignoring ref with broken name" on every ref listing:

| Path in `.git` | Points to |
|---|---|
| `refs/heads/main 2` | 6075b91 |
| `refs/heads/main 3` | b5d8953 |
| `refs/heads/spec11-chat 2` | b5356c8 |
| `AUTO_MERGE 2`, `index 2` to `index 5` | not refs; stray copies |
| `worktrees/<name>/index 2` (entry-questions-tests, status-final, qrewing-bot-backend, g1-face-index, siri-research, more) | stray index copies |

- These are not pushed: the sequence above pushes one named branch, and `git push` skips broken ref names.
- Do not run `git push --all` or `--mirror`, and do not run `fetch --prune` / `gc` with these present. Deciding to
  remove them is the human's call.
- Other local snapshot branches (`qrew-push`, `qrew-push-snapshot`, `-2`, `-3`, `-4`, `pace-snapshot`) stay local.
