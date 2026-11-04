#!/bin/zsh
set -eu
export PATH=/Users/hyeonminyang/.local/share/iya-development/node-v24.22.2-darwin-arm64/bin:"/opt/homebrew/bin:$HOME/.local/bin:$PATH"
cd /Users/hyeonminyang/Desktop/IYA_Project
if ! /opt/homebrew/bin/tmux has-session -t iya-claude 2>/dev/null; then
  /opt/homebrew/bin/tmux new-session -d -s iya-claude -n team -c /Users/hyeonminyang/Desktop/IYA_Project /Users/hyeonminyang/Desktop/IYA_Project/scripts/claude-developer.command
  /opt/homebrew/bin/tmux split-window -h -t iya-claude:team -c /Users/hyeonminyang/Desktop/IYA_Project /Users/hyeonminyang/Desktop/IYA_Project/scripts/claude-supervisor.command
  /opt/homebrew/bin/tmux select-layout -t iya-claude:team even-horizontal
  /opt/homebrew/bin/tmux set-option -t iya-claude mouse on
fi
exec /opt/homebrew/bin/tmux attach-session -t iya-claude
