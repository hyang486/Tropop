# Automatic context handoff

Configured November 4, 2026, America/Los_Angeles, for this project's developer and supervisor sessions.

## Installed component

- Source: https://github.com/alexknowshtml/claude-auto-handoff
- Version: 0.8.6
- Reviewed revision: 8d762ce726c962268e2dbe24c1c60f0889a2fcde
- Location: /Users/hyeonminyang/.local/share/iya-development/claude-auto-handoff
- Loaded only by this project's two launchers using --plugin-dir; unrelated Claude projects were not opted in.

Effortless remains installed for reasoning-effort selection and its other controls. The additional auto-handoff mod handles automatic fresh conversations. Native auto-compaction has not been disabled, so its fallback path remains available. The upstream source was not patched.

## Behavior

At approximately 160,000 context tokens, the mod writes a Haiku-generated brief, runs /clear, and submits a brief-reading prompt to the fresh conversation. The terminal process stays in place; the conversation ID changes. Project files are not cleared. The mod projects unmeasured tool output, so a handoff can start before the next measured token count reaches the threshold.

Each role gets its own instructionsTemplate. The fresh conversation reads its role, the current product baseline, and durable status/review files if present. It continues only already-authorized work; a completed setup or test remains complete. Role instructions do not allow new product decisions or permission approvals.

The role name remains developer or supervisor. At the next peer interaction, the role must discover the counterpart by its current name and this project's directory, rather than retain an obsolete ID or socket path.

## Configuration

The CLI explicitly reads the ignored, machine-local files:

- .claude/runtime/developer.json
- .claude/runtime/supervisor.json

Each contains pluginConfigs["auto-handoff@inline"].options with:

- threshold: 160000
- maxConsecutiveHandoffs: 10
- briefTemplate: planning/handoff/brief.md, using its absolute path
- instructionsTemplate: the matching developer-instructions.md or supervisor-instructions.md
- viewer: an empty string, disabling the viewer HTTP server

The launcher removes a test-only AUTO_HANDOFF_TOKENS override, so a low validation threshold cannot leak into production. It adds only ~/.claude/state/auto-handoff as an additional working directory so the new conversation can read its brief without granting blanket outside-directory read access. Existing permission mode and account authentication are preserved; no permission-bypass flag was added.

The tool's progress safeguards remain: a seeded session must gain at least 40,000 tokens above its starting size before another handoff, and after 10 consecutive automatic handoffs without human input, automatic handoffs pause. A new human prompt resets that counter. This is a handoff limit, not a claim that all other Claude processing necessarily stops. Native compaction remains available.

## Activation and existing conversations

Both existing project sessions were idle. Their saved transcripts were copied to a private backup, then their tmux panes were relaunched with the updated role launcher and the exact saved --resume session ID. The developer and supervisor retained those conversation IDs and returned idle. Their old history was not manually cleared to activate this feature.

The backup directory is recorded in .claude/runtime/pre-handoff-backup.txt. Start Claude Team.command reattaches to the existing environment and uses the updated launchers when creating sessions later. Application implementation has not been started by this setup.

## Verification

- Claude plugin manifest/module validation passed.
- Upstream test suite: 81 passed, 0 failed.
- The CLI resolved both role-specific configuration files with the expected threshold, guard, and instructionsTemplate.
- Shell syntax checks passed for both launchers.
- A real developer-role validation session automatically wrote its brief, cleared to a different conversation ID, read the brief and role/product files, preserved its marker, reported POST_HANDOFF_VERIFIED role=developer, and remained within setup-only scope.
- A separate real supervisor-role validation session did the same with role=supervisor and its own marker, without implementing the app or messaging unrelated sessions.
- A scoped pair of additional probes both crossed into fresh conversation IDs, then rediscovered each other and exchanged POST_RESET_PING / POST_RESET_ACK with actual SendMessage calls. The developer reported POST_RESET_MESSAGING_VERIFIED after receipt. Both probe processes were confirmed to run in this project directory; production and unrelated sessions were not messaged. The probes were then stopped.
- Validation used AUTO_HANDOFF_TOKENS=2000 only in those disposable processes. Normal launchers use 160000 and explicitly discard that environment override.
- The first probe exposed a read-approval prompt for the out-of-project brief path. It was stopped without granting a global read permission. Repeating the test with the narrow --add-dir path completed the read and resumed correctly.
- No long-duration quota-exhaustion test was performed. Usage-limit waiting and automatic continuation remain Claude Code's native behavior, including its own limitations; the handoff mod does not remove those limits.

## Maintenance and rollback

Do not automatically update this local checkout during the deadline period. Recheck compatibility and tests before updating it. To stop automatic handoff for a later run, the upstream AUTO_HANDOFF_DISABLE=1 environment switch is supported; alternatively remove --plugin-dir from both launchers. Do not use DISABLE_AUTO_COMPACT to disable only this mod, since it also disables native compaction.

Keep the role-specific files under planning/handoff synchronized with approved requirements. Do not put credentials, API keys, or raw logs in handoff templates or status documents.
