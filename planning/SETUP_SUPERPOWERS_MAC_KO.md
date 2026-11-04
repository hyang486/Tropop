# Mac 설치 및 시작 가이드

> 최신 iOS 우선 설치 및 개발자·감독관 두 세션 설정은 [SETUP_IOS_TWO_CLAUDE_SESSIONS_KO.md](SETUP_IOS_TWO_CLAUDE_SESSIONS_KO.md)를 먼저 따른다. 아래 가이드에는 이전 iOS·Android 동시 준비 범위가 남아 있다. Android·실제 결제 관련 준비는 최신 기획안의 후속 범위를 따른다.

확인일: 2026-11-04, America/Los_Angeles.

구성: Claude Code + Superpowers + Expo/React Native/TypeScript + Supabase.

이 가이드는 현재 Mac의 설치 상태와 공식 문서를 확인해서 작성했다. 아래 설치 명령은 사용자가 터미널에서 실행할 명령이며, 가이드를 작성하면서 실행한 설치 명령은 없다.

## 1. 현재 확인한 상태

| 항목 | 상태 | 다음 단계 |
|---|---|---|
| Homebrew | /opt/homebrew/bin/brew 있음 | 재설치 불필요 |
| Node.js | 25.8.1 | Node 24 LTS를 프로젝트 개발용으로 선택 |
| npm | 11.11.0 | Node 24 선택 후 함께 제공되는 버전 사용 |
| Git | 2.54.0 | 재설치 불필요 |
| Claude Code | 2.1.289 | 실행·로그인 상태 확인 |
| Xcode | 27.2 | 설치됨. 로컬 iOS 빌드에 사용 |
| iOS Simulator | iOS 26.5 / iPhone 기기들 있음 | 설치됨. Xcode 27에서는 Device Hub로 열기 |
| Superpowers / Expo / Supabase 플러그인 | 설치 목록에 없음 | 아래 명령으로 설치 |
| Android Studio / Android SDK | 기본 경로에 없음 | Android 로컬 빌드용으로 설치 |
| Java JDK | /usr/libexec/java_home에서 런타임 없음 | JDK 17 설치 |

Claude Code에 warp 플러그인은 이미 설치되어 있다. 이번 작업에 추가로 필요한 플러그인을 설치한다.

## 2. 명령을 입력하는 곳

- **터미널 명령:** macOS Terminal 또는 Warp에서 실행. 예: brew, claude plugin install, npx.
- **Claude Code 내부 명령:** 터미널에서 claude를 실행한 뒤 입력. 예: /mcp, /plugin, /reload-plugins.
- **영어 시작 지시문:** Claude Code 대화창에 붙여넣거나 planning/CLAUDE_BOOTSTRAP_EN.md를 읽고 따르라고 요청.

명령은 블록별로 순서대로 실행한다. 오류가 나면 그 단계의 오류를 확인한 다음 이어간다.

## 3. Node 24 LTS 선택

Expo는 Node.js LTS를 요구한다. 현재 Node 25는 공식 릴리스 표에서 EOL 상태이며 Node 24는 LTS다.

터미널:

```bash
brew install node@24
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
node --version
npm --version
```

node --version이 v24.x.x를 출력하면 현재 터미널에서 선택된 것이다. 다른 터미널을 새로 열어도 유지하려면 ~/.zshrc에 아래 한 줄을 한 번만 추가한다. 기존 설정을 보존하고, 파일에 Node 버전을 선택하는 다른 설정이 있다면 중복·우선순위를 확인한다.

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
```

추가한 뒤 새 터미널을 열거나 `source ~/.zshrc`를 실행하고 버전을 확인한다. Node 25를 강제로 제거하거나 brew link --overwrite를 사용할 필요는 없다.

출처: [Expo 프로젝트 요구사항](https://docs.expo.dev/get-started/create-a-project/), [Node 릴리스 상태](https://nodejs.org/en/about/previous-releases), [Homebrew node@24](https://formulae.brew.sh/formula/node@24).

## 4. Claude Code 실행 확인

이미 설치되어 있으므로 다음으로 확인한다.

```bash
claude --version
cd /Users/hyeonminyang/Desktop/IYA_Project
claude
```

로그인이 필요하다고 나오면 브라우저에서 본인 계정으로 로그인한다. Claude Code를 사용할 수 있는 계정 접근 권한이 필요하다. GitHub나 Expo, Supabase 로그인은 각각 별개의 연결이다.

설치가 없는 다른 Mac에서만 사용하는 공식 설치 명령:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

출처: [Claude Code 설치](https://code.claude.com/docs/en/setup).

## 5. 프로젝트용 플러그인 3개 설치

Claude Code가 실행 중이면 종료한 뒤 일반 터미널에서 실행한다. 프로젝트 폴더 안에서 수행한다. 현재 Mac에는 공식 마켓플레이스가 이미 등록되어 있다.

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
claude plugin install superpowers@claude-plugins-official --scope project
claude plugin install expo@claude-plugins-official --scope project
claude plugin install supabase@claude-plugins-official --scope project
```

공식 마켓플레이스가 없다는 오류가 나오는 환경에서만:

```bash
claude plugin marketplace add anthropics/claude-plugins-official
```

설치 확인:

```bash
claude plugin list
```

superpowers, expo, supabase가 설치·활성화 상태인지 확인한다. 프로젝트 범위 설치는 다른 작업과 이 프로젝트의 구성을 분리하기 위해 선택했다.

이후 `claude`로 새 세션을 시작한다. 기존 세션을 유지했다면 내부에서 `/reload-plugins`를 실행한다.

출처: [Superpowers 설치](https://github.com/obra/superpowers#installation), [Expo 설치](https://docs.expo.dev/skills/), [Supabase 설치](https://supabase.com/docs/guides/ai-tools/plugins), [플러그인 범위](https://code.claude.com/docs/en/discover-plugins).

## 6. Vercel React Native 스킬 설치

일반 터미널, 같은 프로젝트 폴더에서:

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
npx skills@latest add vercel-labs/agent-skills --skill vercel-react-native-skills --agent claude-code
```

설치 도구가 확인을 요청하면 지정된 스킬과 Claude Code 대상인지 확인한다. 현재 프로젝트에 설치하는 경로를 선택한다. 전체 Vercel 스킬 모음을 설치할 필요는 없다.

Claude Code를 새로 시작하고 아래 요청으로 로딩을 확인한다.

> Find the installed vercel-react-native-skills skill, read it, and summarize the rules relevant to our chat message list and photo gallery. Tell me if it is unavailable.

출처: [React Native 스킬](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-native-skills), [skills CLI](https://github.com/vercel-labs/skills).

## 7. 계정 준비와 MCP 인증

브라우저에서 본인 계정을 준비한다.

| 계정 | 용도 |
|---|---|
| [Expo](https://expo.dev/signup) | Expo MCP와 빌드·푸시 관련 서비스 |
| [Supabase](https://supabase.com/dashboard) | 개발용 백엔드 프로젝트 |
| [GitHub](https://github.com/) | 코드 백업과 변경 기록 공유 |
| Apple 계정 | 실제 iPhone 서명·배포·푸시 설정 단계에서 사용 |
| Google / Firebase | Android 푸시의 FCM 설정 단계에서 사용 |

Supabase에서 새 개발 프로젝트를 생성할 경우 이름은 예를 들어 moment-dev로 정한다. 데이터베이스 비밀번호는 비밀번호 관리자에 보관한다. 앱이 테스트할 사용자와 가까운 리전을 선택한다. 실제 계정 로그인과 결제·개발자 프로그램 가입은 본인이 진행한다.

터미널:

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
claude
```

Claude Code 내부:

```text
/mcp
```

Expo와 Supabase 서버를 각각 선택하고 인증 안내에 따라 로그인한다. Supabase는 이번 개발에 쓸 프로젝트를 지정한다. 플러그인이 등록한 MCP를 수동 명령으로 다시 추가하지 않는다. Expo 프로젝트 관련 일부 기능은 mobile 앱을 생성·연결한 뒤 사용할 수 있다.

인증 확인용 요청:

> Check the Expo and Supabase MCP connections. Read the Expo Router documentation and inspect the tables in the Supabase development project I selected. Report any missing authentication or project connection. Do not change the database during this check.

앱 설정에는 프로젝트 URL과 공개용 publishable key를 사용한다. 데이터베이스 비밀번호나 서버 secret/service-role key를 앱의 EXPO_PUBLIC_ 변수에 넣지 않는다.

출처: [Expo MCP](https://docs.expo.dev/mcp/), [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp), [Expo/Supabase 연동](https://docs.expo.dev/guides/using-supabase/).

## 8. iOS 개발 환경

Xcode와 iPhone 시뮬레이터는 현재 Mac에 이미 있다. Xcode를 한 번 열어 추가 구성 요소가 필요하다고 나오는지 확인한다.

Xcode 27의 시뮬레이터 관리 앱:

```bash
open -a DeviceHub
```

사용할 iPhone이 실행되지 않았다면 Device Hub에서 실행한다. 설치된 기기 목록은 다음으로 확인한다.

```bash
xcrun simctl list devices available
```

SDK 58을 기준으로 하면 Watchman은 필수 선행 설치 항목이 아니다. 현재 공식 문서는 SDK 55 이하에서만 Watchman을 필수라고 안내한다.

출처: [Expo iOS Simulator 가이드](https://docs.expo.dev/workflow/ios-simulator/).

## 9. Android 개발 환경

### JDK 17

일반 터미널:

```bash
brew install --cask zulu@17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
java -version
```

17.x 버전이 출력되면 확인 완료. 새 터미널에서도 사용하려면 ~/.zshrc에 JAVA_HOME 줄을 한 번 추가한다.

### Android Studio와 SDK

[Android Studio 공식 다운로드](https://developer.android.com/studio)에서 Mac에 맞는 버전을 설치한다. 처음 실행할 때 Standard 설정으로 SDK 구성 요소를 설치한다.

Settings > Languages & Frameworks > Android SDK에서 현재 Expo 공식 가이드에 따라 확인한다.

- SDK Platforms: Android 16 / API 36.
- SDK Tools: Android SDK Build-Tools, Android SDK Platform-Tools, Android Emulator, Android SDK Command-line Tools.
- SDK Location을 확인한다. 기본 경로는 /Users/hyeonminyang/Library/Android/sdk다.

해당 기본 경로를 사용할 경우 ~/.zshrc에 아래 줄을 추가하고 새 터미널을 연다. SDK 위치가 다르면 실제 경로로 바꾼다.

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
```

확인:

```bash
adb version
```

Android Studio의 Device Manager에서 Pixel 등 가상 기기를 만든다. 푸시 테스트에는 Google Play services를 포함한 시스템 이미지를 선택한다. Mac 칩에 맞는 이미지를 사용하고 기기를 실행한다.

```bash
adb devices
```

실행 중인 에뮬레이터가 device 상태로 보이면 준비 완료다. 실제 Android 기기를 사용하면 개발자 옵션과 USB 디버깅을 켜고 기기의 연결 승인 화면을 확인한다.

출처: [Expo Android 설치 가이드](https://docs.expo.dev/workflow/android-studio-emulator/), [푸시 테스트 지원 환경](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## 10. Claude가 앱을 구성할 위치

Claude Code는 다음 상위 폴더에서 시작한다.

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
claude
```

목표 구조:

```text
IYA_Project/
├── CLAUDE.md
├── planning/
├── output/pdf/
├── docs/superpowers/
└── mobile/             # Expo 앱과 package.json
```

기획 자료가 이미 있는 상위 폴더에 새 앱을 강제로 덮어쓰지 않고, Claude가 설계 확인 후 mobile/을 생성하도록 한다. 현재 Expo 공식 새 프로젝트 안내는 SDK 58 개발 빌드용 템플릿을 제공한다. 기기용 Expo Go는 전환 기간에 SDK 57을 사용하므로 이번 앱은 개발 빌드 기준으로 구성한다.

Claude에게 planning/CLAUDE_BOOTSTRAP_EN.md를 읽고 지시에 따라 진행하라고 요청한다. 기존 프롬프트에 BMAD라고 되어 있다면 이번 선택인 Superpowers를 적용한다.

앱 뼈대 생성 시점의 참고 명령:

```bash
npx create-expo-app@latest mobile --template default@sdk-58
```

상위 폴더와 mobile/에 Git 저장소가 중복 생성되지 않도록 Claude가 실제 상태를 확인하고 하나의 저장소로 정리하도록 한다. 기존 파일과 Git 기록이 있다면 보존한다.

출처: [Expo 새 프로젝트 생성](https://docs.expo.dev/get-started/create-a-project/).

## 11. 첫 개발 빌드

다음 단계는 mobile 앱이 만들어진 이후 Claude가 수행할 작업이다. 앱에 필요한 네이티브 기능을 사용할 수 있도록 expo-dev-client를 설치하고 각 플랫폼에서 컴파일한다.

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project/mobile
npx expo install expo-dev-client
npx expo run:ios
```

Android 환경 준비 후:

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project/mobile
npx expo run:android
```

이미 설치한 개발 빌드에 다시 연결할 때:

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project/mobile
npx expo start --dev-client
```

같은 포트에서 개발 서버가 이미 실행 중이면 해당 서버를 재사용하고 중복 시작하지 않는다. 실제 iPhone 빌드는 서명과 Developer Mode 등 추가 설정을 확인한다.

푸시와 백그라운드 위치는 Expo Go만으로 완료 검증할 수 없다. 푸시 자격 증명과 기기 권한은 별도 설정이다. 클라우드 빌드를 선택할 때는 Expo 계정과 EAS 설정·이용 조건도 확인한다.

출처: [개발 빌드](https://docs.expo.dev/develop/development-builds/introduction/), [푸시 설정](https://docs.expo.dev/push-notifications/push-notifications-setup/), [위치 권한](https://docs.expo.dev/versions/latest/sdk/location/).

## 12. 추가 도구는 필요한 단계에서

- Context7: 다른 라이브러리 문서를 확인하는 데 필요할 때 `npx ctx7 setup --claude`.
- Maestro: 핵심 모바일 흐름의 반복 테스트를 추가할 때 CLI 설치 후 `claude mcp add maestro -- maestro mcp`.
- RevenueCat: 실제 유료 구독 구현 단계에서 공식 AI Toolkit을 검토.
- VS Code: 파일 편집용 선택 사항. Claude Code CLI를 시작하는 필수 설치 항목은 아님.
- Supabase 로컬 서버·Docker: 로컬 백엔드가 필요해질 때 검토. 이번 시작은 호스팅된 개발 프로젝트를 기준으로 함.

## 13. 시작 준비 완료 기준

- node --version이 v24.x.x.
- claude --version이 정상 출력되고 로그인 가능.
- Superpowers, Expo, Supabase 플러그인이 활성화됨.
- Vercel React Native 스킬을 Claude가 찾아 읽음.
- Expo/Supabase MCP 인증 상태를 확인함.
- iPhone 시뮬레이터를 실행할 수 있음.
- Android 대상 검증 전 JDK 17, Android SDK, adb 연결을 확인함.
- 기존 기획 문서와 PDF를 Claude가 실제로 읽음.
- 첫 목표가 개발 빌드 실행과 실제 두 사용자 채팅 검증으로 정리됨.
