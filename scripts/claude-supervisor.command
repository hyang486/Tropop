#!/bin/zsh
set -eu
cd /Users/hyeonminyang/Desktop/IYA_Project
export PATH=/Users/hyeonminyang/.local/share/iya-development/node-v24.22.2-darwin-arm64/bin:"$HOME/.local/bin:$PATH"
export CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1
unset AUTO_HANDOFF_TOKENS
role_prompt='You are the supervisor for /Users/hyeonminyang/Desktop/IYA_Project. Your role persists across context resets. Follow planning/CLAUDE_SUPERVISOR_SESSION_EN.md and the latest product specification. The developer session in this project owns implementation; you coordinate and review. Discover peers again after a handoff rather than reusing old session IDs. Continue only user-authorized work; completing setup does not itself start app development.'
exec /Users/hyeonminyang/.local/bin/claude --name supervisor --model claude-opus-5-5 --plugin-dir /Users/hyeonminyang/.local/share/iya-development/claude-auto-handoff --add-dir /Users/hyeonminyang/.claude/state/auto-handoff --settings /Users/hyeonminyang/Desktop/IYA_Project/.claude/runtime/supervisor.json --append-system-prompt "$role_prompt" "$@"
