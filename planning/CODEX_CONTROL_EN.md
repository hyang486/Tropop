# IYA Codex controller

The human authorized a Codex controller for both `developer` and `supervisor` in
`/Users/hyeonminyang/Desktop/IYA_Project`. It does not replace either role.

## Operation

`scripts/claude_control.py` discovers the two named sessions using `claude agents`,
including new session IDs after handoff, and matches their process IDs to panes in
`iya-claude:team`. A lightweight local check runs every three seconds. A Codex CLI
review runs only for a new SQL confirmation or a new final report from an idle role.
There is no model call for every poll. CLI reviews use the existing ChatGPT login,
the explicitly pinned `gpt-6.1-sol` model with `medium` reasoning, an ephemeral
read-only session, and no user config/MCPs.
They consume the account's normal Codex usage. No API key is installed.

Claude permission prompts are also captured. Outside-directory file reads get a
Codex review of the exact displayed path and recent tool inputs, and may receive
only the one-time option (option 4), never a global outside-read grant. This also
covers reads that have not yet been added as tool calls to the transcript.
Other unrecognized permission UIs are recorded and reported to the human, not
clicked. SQL forms and Claude permission dialogs are distinct paths.

The executable is pinned to the ChatGPT app's bundled Codex CLI at
`/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex`.
The Homebrew CLI 0.153.4 returned model_not_found for GPT-6.1 Sol, whereas the
bundled CLI 0.165.0-alpha.1.2 successfully executed the same model and medium
reasoning request. Do not fall back to Astra or substitute another model.

For final reports, Codex chooses `continue`, `wait`, or `human`. Continuation is
limited to previously authorized work; the controller rechecks the same idle
session/report and an empty input before sending a concrete instruction. A user's
unsent draft is never edited or submitted. At most three automatic continuations
per role in ten minutes are allowed. The original reports and review decisions
are recorded privately for audit, not committed.

For a Supabase SQL confirmation, the controller pairs the visible form with the
single unresolved SQL tool call in that session's transcript. It sends the full
arguments to Codex, which can inspect local migrations, tests and review records.
Only an explicit `approve` result can submit the normal Accept selection. Before
submission, it rechecks project, pane, process, session, tool ID, argument hash,
age (under 100 seconds), and the visible form. Multiple unresolved SQL calls,
unknown/expired requests, detected secret-like content and review failures are
not auto-approved. Submitted approval is not recorded as successful execution.
No `skip_elicitations` or permission bypass mode is enabled.

New product choices, real-data destruction outside the authorized lifecycle,
payments/paid-plan changes, authentication/secrets, and safety rejections remain
human decisions. The controller reports human decisions through macOS
notifications and its private event log. Notification display depends on macOS
permissions and notification settings. It never operates other projects.

Latest AWS decision: maintain the Free plan and available credits; prepare and
validate CompareFaces using authorized test photos when server secrets are ready.
Real participant images await opt-out/retention review. No Organizations creation
or paid upgrade is authorized. Never place keys in chat, app config or reports.

## Management

Status: `python3 scripts/claude_control.py status`

LaunchAgent: `~/Library/LaunchAgents/local.iya.codex-control.plist`

Private state, requests, decisions, and events:
`~/.local/state/iya-claude-control/` (directory permissions 0700).

Stop: `launchctl bootout gui/$(id -u)/local.iya.codex-control`

Start: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/local.iya.codex-control.plist`

This runs locally while the Mac is awake and the user is logged in. A model usage
limit, slow review, auth failure, or expired server confirmation leaves the action
unapproved. Desktop heartbeat monitoring can still inspect meaningful failures;
it should not race an active controller review or send duplicate instructions.

Tests: `python3 -m unittest discover -s scripts -p test_claude_control.py -v`
