# Installation status

Date: November 4, 2026, America/Los_Angeles.

## Installed and verified

| Component | Result |
|---|---|
| Node.js | Official v24.22.2 macOS arm64 distribution installed; archive SHA-256 checked against nodejs.org SHASUMS256.txt |
| npm | 11.19.1 bundled with Node 24; verified in a new interactive zsh |
| Claude Code | Updated by its native updater to 2.1.318; both new sessions restarted onto it |
| Claude account | User completed login; authentication verified |
| Superpowers | 7.0.0, project scope, enabled |
| Expo plugin | 1.13.9, project scope, enabled |
| Supabase plugin | 0.1.16, project scope, enabled |
| HeyCubit/effortless | 1.72.0, project scope, enabled; Haiku judge selected and terminal function hooks enabled |
| Automatic context handoff | auto-handoff 0.8.6, role-specific launchers; 160,000-token threshold and 10 consecutive handoffs guard |
| Vercel React Native skill | Installed for Claude Code at .claude/skills/vercel-react-native-skills/ |
| Xcode | Existing 27.2 installation retained |
| iOS Simulator | Existing iOS 26.5 devices retained |
| Git / tmux | Existing installations retained |

Homebrew's Node installation failed with a repeated OpenSSL dependency lock error. No other process was terminated and no lock was manually deleted. The official self-contained Node distribution was used instead. Its path is `/Users/hyeonminyang/.local/share/iya-development/node-v24.22.2-darwin-arm64`. Homebrew installed/upgraded some dependencies before reporting that error; they were left in place.

The Node PATH entry was appended idempotently to ~/.zshrc. The original was backed up as `/Users/hyeonminyang/.zshrc.iyabackup-20261104-014957`. Existing unrelated shell configuration was preserved. New interactive terminals select Node 24; existing terminals may need to be reopened.

## Two-session environment

- A tmux session named `iya-claude` has developer and supervisor panes.
- Both run in `/Users/hyeonminyang/Desktop/IYA_Project`.
- `/list-agents` showed the two sessions to each other.
- A real test message `IYA_SETUP_PING` was delivered from developer to supervisor; supervisor returned `IYA_SUPERVISOR_ACK`, and developer confirmed receipt.
- Effortless rendered in both sessions and selected reasoning effort during the test.
- These were connection checks only. Neither session started application implementation.
- The two sessions were then restarted onto Claude Code 2.1.318. Existing permission mode was inherited; no permission-bypass option was introduced.

Open `Start Claude Team.command` in Finder to attach to the existing two-pane environment. If the tmux session no longer exists, the file creates the two sessions again. It opens Claude without automatically starting implementation. Individual launchers are `scripts/claude-developer.command` and `scripts/claude-supervisor.command`.

Automatic fresh-conversation handoff was subsequently added and activated in both idle sessions, preserving their saved conversations. See planning/AUTO_HANDOFF_SETUP_EN.md for configuration, verification, backup, and rollback details. Effortless's manual Handoff control remains separate from this additional automatic mod.

Role instructions are in `planning/CLAUDE_DEVELOPER_SESSION_EN.md` and `planning/CLAUDE_SUPERVISOR_SESSION_EN.md`. Use the two human-entered startup prompts in the setup guide when ready to begin implementation. The supervisor reviews and coordinates; the developer owns source edits. The standalone launchers deliberately open idle sessions so setup does not itself authorize application implementation.

Project-local `.claude/settings.local.json` enables inbound session messages and terminal function hooks. Existing plugin enablement was preserved in `.claude/settings.json`. Local configuration and environment files were added to `.gitignore`. No Git repository or Expo application was created during tool installation.

## Expo and Supabase connections completed

The user subsequently created both accounts and approved both browser authorization flows. The earlier missing-account state is resolved.

| Connection | Verification |
|---|---|
| plugin:expo:expo | CLI login succeeded; `claude mcp get plugin:expo:expo` reported Connected |
| plugin:supabase:supabase | CLI login succeeded; `claude mcp get plugin:supabase:supabase` reported Connected |

The user's Supabase screenshot shows organization Junevea and an existing project named hyang486's Project with Healthy status. This name is screenshot context; before changing a database, the developer must inspect the authenticated project list and use the matching project's actual identifier. No database tables, policies, storage buckets, or application records were created or modified during this connection step.

An already open Claude session may need its MCP connection refreshed through `/mcp` if it still shows its earlier authentication warning. Do not rerun installation or ask the user to sign up again. Authentication secrets were handled by the CLI/browser flow and were not placed in project documents.

MCP authentication connects Claude's service tools. It does not itself create the Expo app, initialize EAS project configuration, or configure the app's Supabase client. Those steps belong to implementation in mobile/. The Expo screenshot contains a truncated project identifier; do not guess it or scaffold a second app from the dashboard's generic starter commands. Discover the full existing project identifier when linking the app.

Apple Developer signing/push configuration and the selected photo face-matching provider account are implementation-stage setup. Android tooling and real purchase integration remain follow-up scope. React Native/Expo project dependencies will be installed when Claude creates mobile/; they are not global prerequisite programs.
