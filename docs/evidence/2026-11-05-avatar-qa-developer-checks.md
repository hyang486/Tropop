# Avatar QA: developer server and cache checks (2026-11-06 UTC)

These checks go with Codex's device run (`codex-avatar-qa-progress.md`). Everything here is read-only, except step 6, which ran inside a transaction that was rolled back. No device input was sent.

Accounts: host `edeaea51-e4b5-464f-82be-44e0277b2d91` (test@example.com) and Test joiner `97ed7d32-d88b-4e0a-9ddd-03477f1d64be`. Room 94673 "QA verification".

Test images (synthetic: stripes and text, no person):
- `avatar-qa/QA-A.jpg`, sha256 `f26e91686f8ccc993c7a0cfae7554b80ef4a976429b160446bddd871b10e4f61`
- `avatar-qa/QA-B.jpg`, sha256 `53058e95128ed2e7a8def1ecb2047151703661108c63d01a9ff3670307a38e24`

## 1. Server state

### Baseline (2026-11-05 23:53Z)
- Host `avatar_path` was null.
- Joiner `avatar_path` was null.
- The avatars bucket held 0 objects.

### After the device steps (2026-11-06 08:14Z)
- Host `avatar_path` is null (photo removed).
- The `avatars` cleanup jobs, all with reason `avatar_replaced` (the trigger uses the same reason for replace and for remove), attempts 0 and no error:

| Path under `edeaea51…/` | Queued (UTC) | Verified gone (UTC) |
|---|---|---|
| `a9079587-5cdb-4041-96cb-7b992ce822fb.jpg` | 02:43:36 | 02:45:01 |
| `0c94256e-e41b-4aba-a4ad-54f4f613f5e7.jpg` | 02:46:01 | 03:00:03 |
| `9fe3eb9e-2d29-4f89-834d-dd6ebff5360d.jpg` | 07:54:54 | 08:00:03 |
| `d6451ed1-0397-453e-8718-d83ffffb01c5.jpg` | 08:10:04 | 08:15:03 |

- The last upload (`d6451ed1…`, created 07:54:54) is QA-B. It was removed at 08:10:04.
- `9fe3eb9e…` is the photo it replaced: QA-A from the final run, presumably.
- The two 02:4x rows come from an earlier, interrupted device attempt.
- At 08:15:29Z the avatars bucket held 0 objects. The room-janitor run at 08:15:00 succeeded.

## 2. Outsider RLS (step 6): the object variant ran

- Ran at 08:14:52Z, while `d6451ed1…` still existed (queued, not yet purged).
- Method: one `begin … rollback`. Each check set `request.jwt.claims.sub` and then `set local role authenticated`.
- Query: count `storage.objects` in the avatars bucket where the name starts with `edeaea51…/`.
- Results:
  - Random non-member sub: **0** (PASS).
  - Positive control, joiner `97ed7d32`: **1** (PASS).
- Note: a co-member can still read a replaced or removed object until the janitor purges it (at most about 15 minutes). The client only reads the current `avatar_path`.
- The download path goes through the same `avatars_select` policy. That is policy-backed, not observed on a device.

## 3. Guest disk cache (17 Pro, `com.iyaproject.moment`)

- Data container: `C0D839BA-5449-49C7-A85D-0C51B1AF1A39`.
- `Library/Caches/com.hackemist.SDImageCache/default` exists and holds **0 files** after the map was left and the activity ended. PASS for this state.

## Screenshots
- Baseline: `2026-11-05-avatar-0-baseline-host-17.png`, `2026-11-05-avatar-0-baseline-guest-17pro.png`.
- Final, 08:15Z: `2026-11-05-avatar-5-final-host-17.png` (Profile shows the T initial and Add photo) and `2026-11-05-avatar-5-final-guest-17pro.png` (Info shows T for the host).
- I took no screenshots during steps 1–5. Those observations are Codex's.
