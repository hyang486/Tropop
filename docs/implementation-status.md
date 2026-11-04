# Implementation status

Updated: 2026-11-04 (America/Los_Angeles). Plan: `docs/plan/implementation-plan.md`.

## Current checkpoint

Checkpoint 1, foundation: complete and waiting on supervisor review. Next is checkpoint 2, schema v1 plus auth. Migration drafts are in `supabase/migrations/` but have not been applied yet.

## Environment facts (verified)

- Node v24.22.2, npm 11.19.1, Xcode 27.2 (27B52), CocoaPods 1.17.0 (installed via Homebrew 2026-11-04), iOS 26.5 simulators.
- Expo SDK 58.0.23 (npm `latest` tag, matching the SDK 58 template), React Native 0.88.1, React 19.3.0, TypeScript ~6.0.3, Expo Router ~58.0.30, expo-dev-client ~58.0.18.
- Bundle ID / Android package: `com.iyaproject.moment`. URL scheme: `moment`. Display name "Moment" (working name).
- Supabase: one project, `wuhkyjksiiqzoxvonfuy` ("hyang486's Project", us-east-2, Postgres 17). It was empty at inspection (no public tables, no migrations, no buckets).
- Supabase auth settings (from `/auth/v1/settings`): anonymous sign-ins **disabled**, email confirmation **required** (`mailer_autoconfirm: false`).
- EAS CLI: `npx eas-cli@latest whoami` prints "Not logged in". No EAS project is linked.
- The `supabase` CLI binary at /opt/homebrew/bin/supabase exits with 137 in this session. Use the Supabase MCP tools instead.
- No physical iOS device is connected (`xcrun devicectl list devices` shows simulators only).

## Verification log

| Check | Command | Result |
|---|---|---|
| No nested repo | `find . -name .git -not -path ./.git` | none |
| Typecheck | `cd mobile && npx tsc --noEmit` | exit 0 |
| Lint | `cd mobile && npx expo lint` | exit 0 (eslint 9, eslint-config-expo 58) |
| iOS dev build | `cd mobile && CI=1 npx expo run:ios --device 20541309-C36F-4864-94CA-D8A341F70EEB --no-bundler` | exit 0; "Build Succeeded, 0 error(s), 2 warning(s)"; installed and opened on iPhone 17 Pro (iOS 26.5) |
| Metro connection | `CI=1 npx expo start --dev-client --port 8081`, then `xcrun simctl openurl <udid> 'exp+moment://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081'` | "iOS Bundled 1556ms node_modules/expo-router/entry.js (1285 modules)"; screenshot `docs/evidence/checkpoint1-devclient-sim.png` |

## Feature status

| Feature | Status |
|---|---|
| Host accounts / guest entry | not started (needs anonymous sign-ins enabled) |
| Rooms, QR/code join | not started |
| Chat | not started |
| Media upload/download, filters | not started |
| Expiry deletion, 24h reminder | not started |
| Arrival, statuses, Emergency | not started |
| Push | blocked: EAS login, APNs credentials |
| Location, route, speed | not started |
| Face matching | blocked for live results: provider credentials |
| Plan preview | not started |

## Human-only blockers

1. Supabase Dashboard → Authentication → Sign In / Providers: turn on **Allow anonymous sign-ins**. Guests depend on it. For development, also consider turning off **Confirm email**, because the default mailer is rate-limited. Otherwise host sign-up needs a confirmation email.
2. `npx eas-cli@latest login` in a terminal. This is needed for the EAS projectId and Expo push tokens.
3. Apple Developer membership and an APNs key for real push delivery; a physical iPhone for device checks.
4. Face API: AWS credentials (access key and secret, region) with `rekognition:CompareFaces`, to be set as Edge Function secrets.

## Not yet tested

Multi-user behavior, push, physical device, and all product features.
