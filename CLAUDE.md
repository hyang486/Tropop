# IYA / Moment

Temporary group rooms (QR or 5-digit code) with chat, original media sharing, room-scoped photo face matching, arrival notices, opt-in location, Emergency status, and real server-side deletion at expiry. "Moment" is a working name. iOS first; Android is follow-up. Target: 2026-11-08 (America/Los_Angeles).

## Documents

- `planning/APP_CONCEPT_KO.md`: product baseline (Korean). It wins over the older PDF `output/pdf/Moment_All_Wireframes.pdf`.
- `planning/CLAUDE_BOOTSTRAP_EN.md`, `planning/CLAUDE_DEVELOPER_SESSION_EN.md`, `planning/CLAUDE_SUPERVISOR_SESSION_EN.md`: requirements and session roles.
- `docs/plan/implementation-plan.md`: architecture and task order.
- `docs/implementation-status.md`: current checkpoint, verification results, blockers.
- `docs/reviews/`: owned by the supervisor session. The developer does not edit it.

## Roles

The developer session owns source, migrations, tests, config, and the status doc. The supervisor session coordinates and reviews through cross-session messages. Review does not grant permissions or change scope. Talk to the human in Korean; write docs, code and UI copy in English.

## Layout

- `mobile/`: Expo app (SDK 58, RN 0.88, Expo Router routes in `mobile/src/app`). CNG: `mobile/ios` is generated and ignored, so never edit it by hand.
- `supabase/migrations/`: SQL migrations applied to project `wuhkyjksiiqzoxvonfuy`.
- `supabase/functions/`: Edge Functions.

## Environment

Node 24 is at `/Users/hyeonminyang/.local/share/iya-development/node-v24.22.2-darwin-arm64/bin`. Prepend it to `PATH` in non-interactive shells. Xcode 27.2, iOS 26.5 simulators, CocoaPods 1.17.0 (Homebrew).

## Commands (run in `mobile/`)

| Command | Status |
|---|---|
| `npx tsc --noEmit` | verified |
| `npx expo lint` | verified |
| `npx expo run:ios --device <simulator UDID>` | see `docs/implementation-status.md` |
| `npx expo start --dev-client` | Metro for the dev build |
| `npx expo install <pkg>` | use instead of `npm install` for Expo/RN packages |
| unit tests | pending (not configured yet) |
| EAS build / push credentials | pending (EAS CLI not logged in) |

## Conventions

- Expo APIs change every SDK. Check `https://docs.expo.dev/versions/v58.0.0/` before using one.
- Every Supabase table has RLS. Room access is denied by `expires_at` at read time, not only by the cleanup job.
- Never commit secrets. `.env*` is ignored. Client env vars use the `EXPO_PUBLIC_` prefix and contain only publishable keys.
- Do not mark a feature done from a build alone or from mock data. Record evidence in the status doc.
