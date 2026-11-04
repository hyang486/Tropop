# iOS 개발 설치와 Claude 개발자·감독관 세션 설정

확인일: 2026-11-04, America/Los_Angeles.

> 이후 실제 설치를 완료했다. 최신 결과와 남은 계정 연결은 [INSTALLATION_STATUS_2026-11-04.md](INSTALLATION_STATUS_2026-11-04.md)를 먼저 확인한다. Claude Code는 2.1.318로 갱신됐고, Node 24는 Homebrew 오류를 피해서 공식 배포본으로 설치·PATH 설정을 완료했다. 아래 설치 명령을 다시 실행할 필요는 없다. 프로젝트 폴더의 Start Claude Team.command를 더블클릭하면 준비된 두 세션에 접속한다.

> 자동 새 대화 인계도 별도로 적용했다. 현재 실행 파일은 16만 토큰 기준으로 역할별 인계문을 저장하고 새 대화에서 이어간다. 연속 자동 인계는 10회까지이며 상세 설정·검증·해제 방법은 [AUTO_HANDOFF_SETUP_EN.md](AUTO_HANDOFF_SETUP_EN.md)에 있다. 아래의 예전 수동 실행 명령 대신 준비된 실행 파일을 사용해야 이 구성이 적용된다.

이 가이드는 최신 기획안 기준이다. 설치 명령은 사용자가 실행하도록 제공하며, 가이드 작성 중 프로그램 설치·계정 로그인·Claude 세션 실행·설정 파일 변경은 수행하지 않았다. 이 문서는 이전 SETUP_SUPERPOWERS_MAC_KO.md보다 우선한다.

## 1. 현재 Mac에서 확인한 상태

| 항목 | 확인 결과 | 할 일 |
|---|---|---|
| Homebrew | /opt/homebrew/bin/brew | 재설치 불필요 |
| Node.js | v25.8.1, node@24 설치 목록 없음 | 아래에서 Node 24 LTS 설치·선택 |
| Git | 2.54.0 | 재설치 불필요 |
| Claude Code | 2.1.289, native 설치 | 세션 메시지 기능의 버전 조건 충족 |
| Xcode | 27.2 | 설치됨 |
| iPhone 시뮬레이터 | iOS 26.5 기기들 있음 | 설치됨 |
| tmux | 3.7 | 설치됨. 이번 두 터미널 방식에는 필수 아님 |
| Claude 플러그인 | warp만 설치·활성화 | 아래 개발용 플러그인 설치 |
| 공식 Claude 마켓플레이스 | 이미 등록됨 | 재등록 불필요 |
| Claude 구독 로그인 | doctor에서 활성 로그인 확인 안 됨 | 본인이 선택한 인증 방식 확인 |

이 확인은 프로그램 설치 상태에 대한 것이다. 두 Claude 세션을 실제로 띄워 메시지를 주고받는 검증은 아직 하지 않았다. 현재 폴더는 Git 저장소가 아니므로 개발자가 기존 파일을 보존하며 하나의 저장소로 초기화해야 한다.

## 2. 설치할 구성

| 도구 | 역할 | 지금 준비 |
|---|---|---|
| Node 24 LTS | Expo 앱 개발 실행 환경 | 설치 |
| Claude Code | 구현과 리뷰 세션 | 이미 설치됨 |
| Superpowers | 계획·구현·검증 절차 | 플러그인 설치 |
| Expo 플러그인 | Expo 지침·MCP | 플러그인 설치 |
| Supabase 플러그인 | 백엔드 지침·MCP | 플러그인 설치 |
| HeyCubit/effortless | 추론 강도·대화 정리 보조 | 플러그인 설치 |
| Vercel React Native skill | 채팅·갤러리 등 모바일 구현 지침 | 추천 설치 |
| Xcode·iPhone 시뮬레이터 | iOS 빌드·확인 | 이미 설치됨 |

React Native·Expo·TypeScript·앱용 라이브러리는 Claude가 mobile/ 프로젝트를 생성하면서 설치한다. Android Studio·JDK·Firebase Android 설정은 Android 개발 단계에서 준비한다. 실제 결제를 하지 않는 이번 범위에서는 RevenueCat 설치가 필요하지 않다. Docker·Supabase 로컬 서버도 이번 호스팅 백엔드 시작에 필수는 아니다.

## 3. Node 선택

일반 터미널에서 한 줄씩 실행한다.

```bash
brew install node@24
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version
npm --version
```

Node가 v24.x.x인지 확인한다. 새 터미널에도 적용하려면 ~/.zshrc에 다음 한 줄을 한 번만 추가하고 새 터미널을 연다. 기존 Node 버전 관리 설정이 있으면 중복 선택을 정리한다.

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
```

Node 26도 현재 LTS다. 여기서는 기존 프로젝트 준비 가이드와 일관되게 Node 24 LTS를 선택한다. v25는 EOL이다. [Node 공식 릴리스 표](https://nodejs.org/en/about/previous-releases), [Expo 요구사항](https://docs.expo.dev/get-started/create-a-project/)

## 4. Claude 로그인과 플러그인 설치

Claude는 이미 설치되어 있으므로 재설치하지 않는다. Claude 구독으로 사용할 경우 로그인 안내를 따른다. 기존에 의도적으로 API 인증을 구성했다면 그 인증을 유지할 수 있다.

```bash
claude --version
claude auth login
```

아래도 Claude 대화창이 아닌 일반 터미널에서 실행한다.

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
claude plugin install superpowers@claude-plugins-official --scope project
claude plugin install expo@claude-plugins-official --scope project
claude plugin install supabase@claude-plugins-official --scope project
claude plugin marketplace add HeyCubit/effortless
claude plugin install effortless@effortless --scope project
claude plugin list
```

공식 마켓플레이스가 없다는 오류가 날 때만 `claude plugin marketplace add anthropics/claude-plugins-official`을 실행한다. 설치 이후 두 Claude 세션을 새로 시작한다. 이미 실행 중인 세션은 `/reload-plugins`를 실행한다.

출처: [Claude 설치·인증](https://code.claude.com/docs/en/setup), [플러그인 범위](https://code.claude.com/docs/en/discover-plugins), [Superpowers](https://github.com/obra/superpowers#installation), [Expo](https://docs.expo.dev/skills/), [Supabase](https://supabase.com/docs/guides/ai-tools/plugins), [Effortless](https://github.com/HeyCubit/effortless#install).

추천 스킬도 같은 프로젝트에서 설치한다.

```bash
npx skills@latest add vercel-labs/agent-skills --skill vercel-react-native-skills --agent claude-code
```

확인 화면에서는 Claude Code와 프로젝트 범위 설치를 선택한다. [Vercel 원본 스킬](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-native-skills/SKILL.md)

Effortless 설정은 Claude 안에서 `/effortless setup`으로 확인한다. 시작은 Haiku judge, 추가 Jev 키 없이, 실험적인 자동 모델 변경은 꺼둔 구성을 추천한다. README는 추론 강도 자동 변경 지원 모델을 구분하므로 현재 선택한 모델에서 Auto가 동작하는지도 확인한다. Effortless는 세션 간 통신을 제공하는 도구가 아니다.

## 5. 계정·연결 준비

| 계정 | 용도 |
|---|---|
| Expo | 개발 빌드·푸시 관련 설정 |
| Supabase | 개발용 Auth·DB·Storage·Realtime·서버 작업 |
| GitHub | 코드 백업·변경 기록 |
| Apple Developer | 실제 iPhone 서명·푸시·배포 설정 |
| 얼굴 매칭 API 제공업체 | 사진 매칭 연결 단계에서 준비. AWS Rekognition은 후보이며 아직 업체 확정은 아님 |

플러그인 설치 뒤 개발자 세션에서 `/mcp`를 열어 Expo와 Supabase 인증을 진행한다. Supabase는 개발용 프로젝트를 지정한다. 플러그인이 등록한 MCP를 별도 명령으로 중복 추가하지 않는다. API 키는 해당 서비스의 인증·비밀값 설정으로 넣고 채팅이나 앱 공개 설정에 붙여넣지 않는다.

## 6. 두 세션을 연결하는 기능

추천은 Cross-session messaging이다. Mac에서는 v2.1.224 이상이 필요하며 현재 설치 버전은 이를 충족한다. 기본 제공 기능으로 별도 메시징 플러그인이나 Agent Teams 실험 플래그가 필요하지 않다. [공식 세션 메시지 안내](https://code.claude.com/docs/en/cross-session-messaging)

Agent Teams는 Claude가 팀을 생성·관리하는 별도의 실험 기능이다. 이번에는 사용자가 여는 개발자·감독관 두 세션으로 시작한다. [Agent Teams 공식 문서](https://code.claude.com/docs/en/agent-teams)

## 7. 개발자와 감독관 실행

터미널 창 또는 탭을 두 개 연다. 둘 다 같은 폴더에서 시작한다.

개발자 창:

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
claude --name developer --settings '{"crossSessionInbound":"accept"}'
```

감독관 창:

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
claude --name supervisor --settings '{"crossSessionInbound":"accept"}'
```

`--name`은 세션을 구분한다. `--settings`는 지정한 값만 이번 실행에 적용하므로 기존 사용자 설정 파일을 덮어쓰지 않는다. `crossSessionInbound=accept`는 다른 세션에서 오는 메시지 수신을 허용하며 파일 수정·명령 실행 권한을 자동 승인하는 옵션은 아니다. [CLI 옵션](https://code.claude.com/docs/en/cli-reference), [메시지 수신 설정](https://code.claude.com/docs/en/cross-session-messaging#control-inbound-messages)

두 세션에서 각각 아래를 실행해 상대 세션이 표시되는지 확인한다.

```text
/list-agents
```

개발자 창에 이 문장을 직접 입력한다.

```text
Read planning/CLAUDE_DEVELOPER_SESSION_EN.md and follow it. I authorize you to exchange project instructions, progress, review requests, and replies directly with the supervisor session for this project. First send supervisor a short connection check and ask for an acknowledgement.
```

감독관 창에 이 문장을 직접 입력한다.

```text
Read planning/CLAUDE_SUPERVISOR_SESSION_EN.md and follow it. I authorize you to exchange project instructions, review findings, progress, and replies directly with the developer session for this project. Acknowledge developer's connection check, then review the current project and coordinate the first implementation checkpoint.
```

각 역할 파일은 영어로 작성했다. 개발자 세션은 기존 영어 bootstrap도 읽는다. 감독관은 그 문서를 요구사항·검증 기준으로 읽으며 직접 앱을 만드는 실행 지시로 해석하지 않는다.

## 8. 추천 운영 규칙

다음은 이 프로젝트에 제안하는 작업 분담이며 프로그램이 강제로 보장하는 권한 체계는 아니다.

- 개발자만 앱 소스·마이그레이션·설정을 수정한다. 감독관은 읽기·리뷰·검증과 자기 리뷰 문서 작성을 담당한다.
- 개발자는 기능 단위로 변경 파일·검증 명령·결과를 감독관에게 보낸다. 감독관은 근거 있는 수정 요청 또는 통과 결과를 보낸다.
- 감독관의 통과는 코드 리뷰 판단이다. 사용자 대신 권한 요청에 동의하거나 기능 범위를 바꿀 수 없다.
- 감독관은 개발자가 안정된 확인 지점을 알린 뒤 검사한다. 두 세션이 동시에 같은 빌드·개발 서버를 띄우지 않는다.
- 두 세션이 모두 통과를 확인한 항목은 다음 구현으로 넘어간다. 새 증거 없이 같은 검토나 연결 확인 메시지를 반복하지 않는다.
- 역할과 완료·미완료·다음 작업을 파일에 기록한다. 세션을 닫았다가 다시 열 때 해당 역할 파일과 상태를 읽힌다. 일반적인 코드 작성·수정·테스트는 확인된 범위 안에서 계속한다.

두 세션은 각자 모델 요청을 사용하므로 실행 비용·사용량이 늘어날 수 있다. 매 작은 행동마다 검토시키기보다 기능 단위로 검토를 요청하는 운영을 추천한다. [Claude 비용 안내](https://code.claude.com/docs/en/costs)

## 9. 연결이 안 될 때

1. 두 창 모두 `claude --version`과 `/list-agents`를 확인한다. 기존에 열어둔 오래된 세션은 다시 시작한다.
2. `/status`에서 Peer address가 사용 가능한지 확인한다.
3. 같은 이름의 세션이 여러 개 있으면 Claude가 목록의 식별자로 상대를 구분하게 한다.
4. 다른 세션이 긴 명령을 실행 중이면 메시지 처리가 바로 보이지 않을 수 있다.
5. `/list-agents`가 인식되지 않거나 메시지가 거절되면 Claude가 실제 오류와 적용 설정을 조사하게 한다. 메시지 기능이 없다는 추측만으로 별도 통신 도구를 추가하지 않는다.

실행 권한 문제와 메시지 연결 문제를 구분한다. 감독관 메시지는 사용자 승인이나 설정 변경 허가를 대신하지 못한다. [공식 문제 해결·메시지 처리 설명](https://code.claude.com/docs/en/cross-session-messaging)

## 10. 첫 구현 확인 지점

개발자가 현재 자료를 보존하며 Git과 mobile/ 앱을 구성하고, iOS 개발 빌드를 띄운다. 감독관은 최신 사용자 결정을 기준으로 확인한다: 게스트 입장, 도착 버튼 우선·기본 실제 위치 공유, 사진만 API 얼굴 매칭, 원본 사진·영상 공유, 앱 내 Emergency·일반 푸시, 실제 서버 만료 삭제, 만료 24시간 전 알림, 결제 시연 화면.

처음에는 기획 설명을 반복하기보다 환경·인증 상태를 확인하고 실제 iOS 빌드 실행까지 진행한다. 추가 제품 기능이나 범위 변경은 사용자 결정 후 적용한다.
