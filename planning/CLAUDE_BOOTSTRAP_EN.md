# Start this project with Superpowers

Use the installed Superpowers workflow as the primary development process for this project.

Updated November 4, 2026 with the user's confirmed decisions. Use HeyCubit/effortless as an additional Claude Code execution aid; it does not replace the product requirements or development workflow. Inspect its installed version and compatibility before relying on its features. Do not assume that it is installed already.

## Read first

- `planning/APP_CONCEPT_KO.md`
- `output/pdf/Moment_All_Wireframes.pdf`
- `planning/SETUP_IOS_TWO_CLAUDE_SESSIONS_KO.md`
- `planning/INSTALLATION_STATUS_2026-11-04.md`

The updated Korean product specification is the product baseline. The PDF contains older concept screens and sample data, not an implemented application. It predates guest entry, manual arrival, room-scoped face enrollment, and preview-only billing; use the updated specification when they differ. Setup and research documents are historical guidance, not authority to restore an older scope. Preserve the distinction between confirmed requirements, proposed behavior, and unresolved decisions.

For the user's two-session workflow, the developer session also follows `planning/CLAUDE_DEVELOPER_SESSION_EN.md`; the separate supervisor follows `planning/CLAUDE_SUPERVISOR_SESSION_EN.md`. They use built-in cross-session messaging. Only the developer edits application source and configuration; the supervisor reviews and coordinates confirmed work. This workflow does not require the experimental Agent Teams flag.

The project launchers now load automatic fresh-conversation handoff in addition to Effortless. Read `planning/AUTO_HANDOFF_SETUP_EN.md` for its actual settings and validation. Preserve the role and approved scope across resets, read the role-specific handoff instructions, and rediscover the peer by name rather than carrying an old session ID forward. Do not reinstall the mod or add another context manager.

The required development plugins and Node 24 are now installed. The user has created Expo and Supabase accounts, and both MCP connections have been authenticated and checked as Connected. Reuse that setup; inspect the installation record and current connections rather than repeating signup or installation. An open session may need to refresh a stale MCP connection via `/mcp`. Linking mobile/ to the correct existing Expo and Supabase projects is still implementation work; no app or database schema has been created by setup.

## Target and communication

- Target date: November 8, 2026, America/Los_Angeles.
- Build and verify iOS first. Preserve the React Native architecture for later Android support; Android release and device verification are follow-up work.
- Write project instructions, specifications, architecture, plans, and test documentation in English.
- Keep all app UI copy in English.
- Communicate with me in Korean.

## Working environment and stack

- Work from `/Users/hyeonminyang/Desktop/IYA_Project` so you can read the planning files and PDF.
- Create the Expo application in `mobile/` after inspecting the directory and agreeing on the design. Preserve existing files.
- Use React Native, Expo, TypeScript, and Expo Router. Choose the current stable, compatible SDK and dependencies. The setup guide records the SDK 58 template available when it was written; verify compatibility before scaffolding.
- Prefer Supabase for authentication, database, realtime messaging, storage, and scheduled server jobs.
- Use the official Expo and Supabase plugins and `vercel-react-native-skills` when relevant.
- Inspect the installed Superpowers version and follow its available workflow. Use Superpowers as the primary orchestration process.
- Verify the selected Node LTS version, Xcode, account connections, and available iOS test devices. Android SDK/JDK setup must not block the iOS milestone. Report actual blockers precisely.
- Keep one coherent Git repository for the project. Check whether scaffolding creates a nested repository before committing anything. Preserve existing history and unrelated changes.

## Planning and documentation

Start by reading the supplied files and inspecting the current project. Reuse decisions already recorded. Ask only questions whose answers materially affect the product and cannot be found in the existing material.

Create or update a concise root `CLAUDE.md` containing project context, document locations, development conventions, and verified build/test commands. Keep detailed product requirements, architecture, implementation plans, and acceptance criteria in separate documents. Mark unconfigured commands as pending rather than inventing them. Keep documentation synchronized with actual implementation.

Use the installed Superpowers design and planning workflow. Reuse the existing product concept and wireframes instead of repeating broad product discovery. Propose a small, testable implementation sequence and concrete completion criteria. Identify features that may exceed the remaining time without silently removing them from the product vision.

The user intends to run coding agents for extended periods. Continue routine implementation and verification autonomously within the confirmed scope. Do not turn ordinary implementation effort into repeated product questions or silently defer confirmed features. Obtain the user's decision before making a material scope change. Keep decisions and progress in project files so compaction or handoff does not lose them. Effortless may assist with reasoning effort, compaction, and handoff; it does not substitute for tests or physical-device checks.

## Essential product behavior

- Rooms have a host-selected server-side expiration time and support QR or five-digit invitation codes.
- Keep host account signup, signin, signout, account deletion, and profiles. Participants install the app and join as guests without mandatory signup. Give guests authenticated server identities and enforce room membership; guest entry is not public unauthenticated access. Web-first entry has not been approved.
- Current room members can exchange messages and actually upload, view, and download photos, videos, and general files. Preserve originals, use separate lightweight previews, and handle upload progress, failure, and retry. Choose appropriate upload methods for the selected React Native runtime. Do not silently exclude ordinary video sharing. Automatic video editing and adaptive multi-rendition streaming are not requirements.
- Support All / Mine / Others uploader filters and actual photo-only face matching via an existing face comparison API. Do not train a new recognition model or implement face recognition in videos.
- On first use of Photos of me in each room, offer Take photo / Choose from gallery for a reference image. Keep the reference separate from the profile and shared gallery. Match existing and newly uploaded room photos. Scope references, any derived face data, and personal match results to that room membership. Delete them on leave, room expiration, or room deletion, including any retained provider-side records. Invalidate queued work and prevent late API results from recreating deleted data. Do not retain a global account face reference or reuse another room's enrollment. Face matching is optional for the user, not deferred implementation scope.
- Send a reminder to current room members 24 hours before expiration. Handle duplicate prevention, expiration changes, and users who have left.
- Actually delete expired room data and stored media on the server. Deny access at expiration independently of cleanup timing. Use supported Storage deletion APIs, track failures, and retry; hiding a room or deleting database metadata alone is not completion. A reference image originally selected from the user's own device is not deleted from their gallery by this server cleanup.
- Location transmission requires an active room membership, room-level permission, individual opt-in, device permissions, and an active activity. Stop transmission when any required condition ceases to hold.
- Prioritize a manual Arrived button: record the member and server arrival time and notify the room without requiring GPS. Deduplicate repeated taps. A missing arrival tap is not automatically an emergency.
- Implement actual basic opt-in location sharing while the app is in use, a shared drawn route, member locations and basic speeds, and host-defined statuses. Keep the existing location consent and shutdown rules. Continuous locked-phone/background tracking during exercise is follow-up development and stabilization; do not claim it passed without physical-device evidence.
- Implement the required Emergency status as a real room event, visible in-app alert with sound/haptics where available, and ordinary push notifications for background recipients. This is an app notification feature; AMBER-style system alerts, special Critical Alerts behavior, and automatic emergency-service contact are not required.
- Preserve user control over location. Do not imply that Emergency overrides disabled location sharing or guarantees notification delivery.
- Keep the existing paid-benefit concept: extra emoji, larger rooms, and longer lifetimes. Build plan/benefit preview screens only for this milestone. Do not connect real purchases, billing credentials, charges, subscription verification, or real paid entitlements. Label the purchase interaction as a preview. The payer, pricing, and thresholds remain undecided; do not recast the product as host-only billing without approval.

## Implementation and verification

Build in small increments. Obtain a working native development build early rather than relying only on Expo Go or a browser preview.

Prioritize an observable path through host authentication, room creation, guest code/QR joining, two-user realtime messaging, original photo/video transfer, room expiration with actual deletion, and the expiry reminder. Connect manual arrival, basic foreground location, route/status/Emergency, photo-only API face matching, and plan-preview flows within the confirmed scope.

Use meaningful tests for permissions, guest membership, expiration, storage deletion, scheduled reminders, and room-scoped face cleanup, including late-running jobs. Verify iOS and multi-user behavior on two devices or suitable test environments. Check physical-device behavior for features that require it. Record actual API matches on test photos, not placeholder face-filter output.

Do not mark an actual feature complete from mock data, a successful compilation alone, or an unexecuted test. The explicitly approved paid-plan preview is the exception: a functioning preview is its intended completion level, not a completed payment integration. Record what passed, failed, remains blocked, and has not been tested. Keep the deadline and remaining risks visible without claiming guaranteed delivery of the entire product.

Start now by inspecting the supplied files and environment, summarizing the current state, and following the installed Superpowers workflow toward a concrete design and implementation plan.
