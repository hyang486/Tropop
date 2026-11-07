# Claude session model policy

Approved by the human on November 4, 2026 (America/Los_Angeles).

- Developer: Opus 5.5 as the base model, with Effortless 1.72.0 `modelAuto: "on"`. With automatic effort enabled, its Haiku judge may route a prompt to Haiku or Sonnet when the cache-cost check predicts that switching pays. Complex work, a recent failed cheaper response, or an expensive cold-cache switch can keep a prompt on Opus.
- Supervisor: Opus 5.5 as the main conversation model, with Effortless `modelAuto: "off"`. Haiku calls used for effort judgment and handoff summaries remain separate helper calls.
- Both roles explicitly use the Haiku judge through the existing Claude login; no Jev credit, external model-router account, or new API key is required by this policy.

The role launchers pin `--model claude-opus-5-5` and read their own ignored `.claude/runtime/<role>.json` through `--settings`. Those files contain the matching `pluginConfigs["effortless@effortless"].options` as well as the existing automatic-handoff settings. Do not copy one role's runtime settings over the other role's file.

The automatic handoff keeps the existing process and role settings. Role handoff instructions also record the policy. Starting with `Start Claude Team.command` reattaches if the team already exists; it does not restart it or submit a new task.

Effortless's settings panel can save shared plugin state. At configuration time its `savedSettings` store was empty and did not override the per-role CLI options. Do not change the model-routing toggle in that shared panel to configure these two roles; use the separate runtime files and restart an idle session with its saved conversation. `/effortless debug` shows the actual running routing policy; `/model` shows the base model and can still display Opus while a specific request is routed elsewhere. Automatic effort must remain on for cheaper routing to run.

This policy does not promise reduced Claude Max usage: model caches are separate and switching can cost more. It does not change payment, usage limits, permission prompts, or product scope. Existing context handoff and native usage-limit continuation remain in place.

## Verification and activation

Both role runtime files resolve to the intended Effortless settings and both launcher shell syntax checks passed. The supervisor was idle, backed up and resumed under the same saved conversation with Opus pinned; its actual `/effortless debug` output reports `model: always the chat's`. A separate tool-disabled developer-settings probe reports `model: cheaper when it can, now the chat's`, with Auto on, and was then exited. The shared Effortless saved-settings store had no override.

The earlier approval request expired during development and the developer completed a native automatic context handoff to conversation `0800566d-54c7-4e3f-ad2e-519426d44247`. The human then explicitly authorized the setup assistant to review and handle the SQL confirmation. The updated `access_and_rpcs` migration was reviewed, the matching existing-project approval accepted, and the actual Supabase tool result was `success: true`. The developer saved a maintenance checkpoint and finished its turn; the only background command was the long-running Expo development server. Its transcript and unsent terminal draft were backed up before restarting.

The developer was resumed under that exact saved conversation with its updated role launcher. Its actual `/effortless debug` reports `model: cheaper when it can, now the chat's`, with Auto on. The supervisor remains on the unchanged conversation and its debug reports `model: always the chat's`. Both active-role settings are now applied. Development is resumed separately after validation; no application source was edited by the setup assistant. Restarting can stop the Expo development server, so the developer should check and restart it when needed.
