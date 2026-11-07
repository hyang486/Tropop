#!/bin/zsh
set -eu
printf '\033]0;IYA Codex 관제 모니터\007'
print 'IYA Codex 관제 모니터'
print '개발자·감독관 상태와 Codex 판단 기록을 표시합니다.'
print '별도 Codex 대화창이 아니라 실제 백그라운드 관제 기록입니다.'
print '이 창을 닫아도 관제는 계속됩니다.'
/opt/homebrew/bin/python3 /Users/hyeonminyang/Desktop/IYA_Project/scripts/claude_control.py status
print '\n최근 판단 및 처리 기록 (새 기록은 자동 표시)'
exec /usr/bin/tail -n 15 -F /Users/hyeonminyang/.local/state/iya-claude-control/events.jsonl
