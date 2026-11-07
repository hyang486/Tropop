# Codex 새 세션 인수인계 — 2026-11-06

## 사용자의 요청과 운영 방식
IYA 앱 초본 개발을 빠르게 완료하도록 기존 Claude supervisor/developer를 조율하고 Codex가 직접 시뮬레이터 QA를 수행한다. 사용자는 반복적인 승인·수동 탭 요청과 불필요한 대기에 매우 불만이다. 구현은 Claude developer, 배정/리뷰는 supervisor. Codex는 supervisor에게만 전달하고 supervisor가 developer에게 전달하도록 한다. Codex가 앱 코드를 대신 수정하지 않는다. 자동 관제기와 5분 heartbeat는 사용자가 껐다. 재시작하지 않는다.

작업 폴더 /Users/hyeonminyang/Desktop/IYA_Project, Supabase 프로젝트 wuhkyjksiiqzoxvonfuy만 접근. 다른 세션/프로젝트 접근 금지. 실행 중 빌드·handoff 중단 금지. 사용자 미전송 입력을 덮어쓰거나 대신 제출하지 말 것. 상태 보고는 실제 증거와 구현 보고를 구분한다.

## 다음에 즉시 할 일: F1 지도 속도 기기 QA
두 Claude는 지금 Codex의 Part A를 기다린다. docs/reviews/codex-f1-map-speed-steps.md를 먼저 읽는다.
- 기존 방 QA verification, 코드 94673. 서버 만료 2026-11-06 21:31:42Z = LA 13:31:42. 마지막 확인 19:09Z에는 2h22m 남았음. 새 세션에서는 현재 시각과 유효 여부를 다시 확인.
- host test@example.com: iPhone 17 F11BA960-84AE-4AFA-A234-92800AF43B9E
- guest Test joiner: iPhone 17 Pro 20541309-C36F-4864-94CA-D8A341F70EEB
- Part A 미완료: host 방 Map에서 Start activity, guest 방 Map에서 Share my live location ON. 실제 완료 후 supervisor에게 알린다. 현재 활동은 시작하지 않았고 공유도 켜지지 않았다.
- developer는 준비된 simctl 경로로 guest를 동쪽 5m/s 이동시킨다. supervisor 경유로 시작/정지를 조율. Codex는 HOST 지도 핀 아래 Test joiner · 18.0 km/h 및 멤버 행 18.0 km/h · Updated …를 직접 관찰. 움직임 종료 후 60~90초 뒤 정지/오래됨 표시 확인. 스크린샷 증거 필요.
- guest 공유 OFF, host 활동 종료 확인. developer가 가상 위치와 live_presence 정리 확인.
- 속도는 기존 핀 아래/목록 텍스트가 요구사항. 핀 탭 callout이나 강조는 현재 구현/요구사항이 아님. 이를 새 기능으로 추가시키지 않는다.

## 지금 막힌 실제 원인
Codex UI 도구가 좌표 탭에 windowNotFoundAtPosition 오류를 반복한다. 마지막 host는 방 채팅 화면까지 이동했으나 Map 탭 실패. guest는 Map 화면, No activity running/OFF까지 확인. 두 Claude가 서버 작업 중이라 멈춘 것이 아니라 Codex 조작 준비 대기다. 해결된 것처럼 보고하지 말 것.
- macOS 앱은 Simulator.app 대신 Device Hub, bundle com.apple.dt.Devices. CUA getApp으로 선택.
- 창 메뉴 Window에 iPhone 17/17 Pro가 있음. 메뉴 indices가 자주 바뀜. getAXState 직후 확인/선택.
- 도구는 창 트리는 읽지만 React Native 헤더 Map/Profile 링크가 종종 AX에서 빠져 좌표가 필요.
- 외부 디스플레이/아이패드 창 이동과 크기 변경 시 좌표 변환 실패가 잦다. Move to Built-in Retina Display, Center를 시도했지만 최근 Map 좌표 실패 지속. 최신 스크린샷으로만 좌표를 사용한다.
- 이전에 사용자 지시로 simctl shutdown/boot를 두 기기에 실행했을 때 guest 접근성과 좌표 조작이 복구되어 사진 QA를 완료했다. 앱·계정 데이터 초기화는 하지 않았다.
- CUA pressKey Return이 host에서 안 되면 Device > Keyboard > Toggle Software Keyboard로 화면 키보드를 띄워 Go를 눌렀다.
- 앱 deep link moment:// 와 moment://profile 사용 가능. 과거 Safari로 실행했으나 사용자가 Safari 사용에 강하게 의문을 제기했다. 가능하면 앱 내부 탐색.
- 절대 시뮬레이터에 app.paste를 사용하지 말 것: 기존 사용자 클립보드가 붙어 테스트 지시문이 구글로 전송된 실수가 있었다. 주소/텍스트는 AX setValue 후 실제 값 검증. 검색 결과는 QA 증거가 아니다.
- host Expo Tools gear가 Profile 버튼을 가려 Tools button OFF로 설정했다.
- CUA 작업이 끝나면 해당 도구의 completion_summary 규칙 준수.

## Claude 세션/터미널 (항상 재발견)
claude agents --json --cwd /Users/hyeonminyang/Desktop/IYA_Project
tmux iya-claude:team.0 developer pid77064, 마지막 session c3c4009e-238d-4677-8599-f239127b9328
tmux iya-claude:team.1 supervisor pid76858, 마지막 session c5e503b6-4f10-483f-979c-5191563ab25f
마지막 developer status busy이나 실제로는 Metro 같은 background shell과 F1 준비 대기. supervisor idle. status 문자열만으로 판단하지 않는다.
현재 미전송 입력: developer 'F1 진행해', supervisor 'Part A done'. Part A는 실제 미완료이므로 supervisor 입력을 제출하면 안 된다. 사용자 draft 취급/보존.
긴 tmux send-keys 메시지가 잘려 끝부분만 도착한 적 있음. 자세한 내용은 파일로 저장하고 짧은 경로 메시지를 전달한 뒤 실제 수신/작업 재개를 확인한다.

## 승인과 완료 현황
planning/CODEX_USER_APPROVAL_2026-11-06.md 및 planning/USER_DECISIONS_2026-11-04_OPERATIONS_EN.md에 사용자 승인 기록.
- 일회용 계정 정확히 1개 생성·삭제 QA 승인. 실행된 계정 6ff53e9a-d08d-43c1-82a0-fcc164597a0e는 이미 삭제됐다. 기존 test@example.com/Test joiner는 보존. 반복 생성 불필요.
- F2 서버 삭제 QA 통과: 계정/프로필/방/관련 데이터 삭제 후 janitor 08:45Z가 avatar와 잔여 파일 정리. supervisor 독립 확인, 열린 cleanup_jobs 0. 앱 삭제 버튼 UI 흐름은 미검증(직접 POST로 테스트). acdd342 상태 커밋.
- face-match/delete-account valid JWT가 401 되던 버그 발견/수정 be82fd1, 둘 다 v2 재배포. 무토큰401, GET405, 유효 JWT face-match503(기능 OFF). served source 읽어 repo와 비교, byte hash는 아님.
- face-match 배포 승인/실행됨. FACE_MATCH_ENABLED와 secrets는 바꾸지 않았다. 실제 positive CompareFaces 미검증: 승인된 얼굴 테스트 fixture가 없음. QA-A/B는 비얼굴 도형이라 positive 증명 불가. AWS Free/$100 credits 유지, 유료전환/Organizations/실참가자 사진 금지. secrets 값 노출 금지. 사용자 스크린샷에서 AWS secrets 저장 확인됐으므로 다시 입력 요구 금지.
- duplicate .claude/settings.local 2.json은 active 설정과 비교 후 backup/remove 승인됐음. 실제 처리 여부는 문서에서 다시 확인. 활성 권한을 약화하거나 안전 거절 우회 금지.

## 이미 Codex가 직접 끝낸 사진 QA
docs/evidence/codex-avatar-qa-progress.md 참조. host QA-A 설정, guest Info 다시 열어 QA-A 표시, host QA-B 교체, guest 다시 열어 QA-B 표시, guest 지도 QA-B 사진 핀/이름 Test 표시, 사진 삭제 후 host 및 guest T 이니셜 복원 통과. 양쪽 위치공유 OFF 및 host 활동 종료 완료. 당시 가상 위치 Cupertino/San Francisco와 Allow Once만 사용. 실시간 사진 변경(재진입 없이), 실제 디스크 캐시/서버 권한 확인은 UI 증거로 대체하지 않는다. supervisor가 별도 서버/캐시 검토한 기록은 docs/reviews/current.md에 있음.

## 주요 문서/작업 트리
CLAUDE.md, docs/CURRENT_STATE.md, docs/DEMO.md, docs/reviews/current.md, planning/USER_DECISIONS_2026-11-04_NOTIFICATIONS_EN.md, OPERATIONS_EN.md, 최신 기획을 확인. 무료 파일당 50MB 유지, Apple 유료 가입/APNs는 초본 필수 아님. 방 만료/실제 삭제 요구사항 임의 축소 금지.
작업 트리에 다른 에이전트/사용자 변경과 untracked 파일이 많다. reset/clean/일괄커밋 금지. 기존 자동 관제 스크립트도 있지만 재활성화하지 않는다.
