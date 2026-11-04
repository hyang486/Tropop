# Claude Code용 모바일 앱 개발 도구 조사

조사 기준일: 2026-11-04, America/Los_Angeles. 목표 마감: 2026-11-08.

대상: React Native로 개발할 일시적 그룹 채팅 앱. 계정, QR/5자리 참여, 자동 만료, 만료 24시간 전 알림, 원본 사진 공유, 스포츠 위치·속도·상태, 얼굴 매칭, 유료 플랜이 전체 제품 요구사항이다.

이 문서는 도구 추천과 도입 순서에 대한 조사다. 설치·계정 연결·실제 앱 구현은 수행하지 않았다. 아래 일정과 기능 우선순위는 제안이며 기존 요구사항을 삭제하거나 확정된 개발 약속으로 바꾸지 않는다.

## 추천 조합

전체 개발 과정을 이끌 도구를 원한다면 아래 ‘개발 전 과정 프레임워크’ 비교부터 확인한다. BMAD, Superpowers, GSD Core 등에서 총괄 워크플로 하나를 정하고, Expo·Supabase 도구를 해당 앱의 기술 도구로 붙이는 구성을 제안한다.

첫 설정은 **Claude Code + Expo 공식 플러그인 + Supabase 공식 플러그인 + Vercel React Native 스킬**을 추천한다. Context7은 기타 라이브러리 문서 조회, Maestro는 반복 가능한 모바일 테스트가 필요할 때 추가한다.

스킬은 작업 방법을 알려주는 지침이다. MCP는 데이터베이스나 실행 중인 앱을 조작할 수 있게 하는 연결이다. 플러그인은 둘을 묶어서 배포할 수 있다. 모두 설치한다고 앱 기능이 자동으로 완성되지는 않는다.

## 개발 전 과정 프레임워크 (추가 조사)

단일 기능용 스킬과 별개로, 기획부터 작업 계획·구현·테스트·검증까지 이끄는 유명한 공개 프로젝트가 있다. 2026-11-04에 공식 README와 GitHub API를 확인했다.

| 프레임워크 | 공개 관심도 | 제공하는 개발 흐름 | 이 프로젝트에 대한 판단 |
|---|---:|---|---|
| [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) | 약 54,975 stars | 제품·UX·아키텍처·개발·테스트 관점을 연결하는 전체 전달 과정 | 기획부터 제품 전체를 체계화하려는 요청에 가장 가까운 선택으로 판단 |
| [Superpowers](https://github.com/obra/superpowers) | 약 312,043 stars | 요구사항 정리, 구현 계획, 실행, 테스트, 리뷰, 완료 검증 | 이미 기획과 화면이 있는 현재 상태에서 마감까지 구현·검증을 이끌 도구로 우선 추천 |
| [GSD Core](https://github.com/open-gsd/gsd-core) | 약 11,224 stars | Discuss → Plan → Execute → Verify → Ship | 단계별 작업과 상태를 이어가며 실행·검증하려는 경우의 대안 |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | 약 146,837 stars | 요구 명세 → 계획 → 작업 → 구현 → 수렴 검증. 아이디어 평가·버그 수정 확장도 제공 | 요구사항 추적과 충족 여부를 명확히 남길 때 적합 |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | 약 73,869 stars | 제안·요구사항·설계·작업을 변경 단위로 정리하고 구현·보관 | 기능 추가와 요구 변경을 관리하는 가벼운 명세 중심 접근 |

BMAD, Superpowers, Spec Kit, OpenSpec의 최근 저장소 push는 LA 기준 2026-11-03이다. GSD Core의 최근 push도 LA 기준 2026-11-03이다. 별 수와 push는 사용 인원이나 완성 속도의 측정치가 아니다. 추천은 문서화된 동작과 이번 프로젝트 상황에 따른 판단이다.

### BMAD의 현재 버전 선택

현재 공식 README는 npm 설치 경로의 v6.12를 안정판으로, main 브랜치의 v7을 preview alpha로 구분한다. npm registry의 latest는 조사 시점 6.12.4였다. 11월 8일 마감에는 안정판을 선택하는 쪽을 제안한다. 설치 전 Node.js 20.12+, Python 3.10+, uv 요구사항을 확인한다.

```bash
npx bmad-method@6.12.4 install
```

이는 참고 설치 명령이며 이 조사에서 실행하지 않았다. 설치 후 코딩 도구에서 bmad-help와 bmad-build를 진입점으로 사용할 수 있다. v7용 최신 skills CLI 설치 경로와 v6 안정판 경로를 섞지 않는다.

출처: [현재 공식 README](https://github.com/bmad-code-org/BMAD-METHOD), [V6.12 문서와 소스](https://github.com/bmad-code-org/BMAD-METHOD/tree/V6.12), [npm 최신 버전 메타데이터](https://registry.npmjs.org/bmad-method/latest).

### GSD의 현재 저장소

예전 [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)는 현재 archived 상태이며 README가 [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core)로 안내한다. 예전 저장소의 약 64,167 stars를 현재 GSD Core의 별 수로 표시하면 안 된다.

현재 공식 설치 진입점은 다음과 같다.

```bash
npx @opengsd/gsd-core@latest
```

현재 README는 새 프로젝트에 `/gsd-new-project`, 기존 코드에는 `/gsd-onboard`를 안내한다. 예전 가이드의 패키지 이름과 콜론 명령을 현재 명령으로 단정하지 않는다.

### 무인 실행을 더 원하는 경우

[BMad Loop](https://github.com/bmad-code-org/bmad-loop)는 BMAD 프로젝트의 개발·검증·별도 리뷰·커밋 반복을 자동화하는 공식 조직의 추가 도구다. 조사 시점 별 수는 177개로, BMAD 본체와 인기도를 구분해야 한다. BMAD 프로젝트와 테스트 명령 등 설정이 필요하고 추가 환경 요구사항도 있다. ‘아무 설정 없이 전체 앱을 완성하는 도구’로 보기는 어렵다. 마감 직전 첫 선택으로는 설정 부담을 먼저 평가한다.

### 이 앱에 대한 최종 선택 제안

- 기획부터 전체 제품 과정을 체계적으로 진행하려면 **BMAD 안정판 + Expo + Supabase**.
- 기존 기획 문서와 와이어프레임을 활용해 11월 8일까지 구현·검증을 진행하려면 **Superpowers + Expo + Supabase**를 우선 추천.
- 단계별 실행과 지속적인 상태 관리가 특히 중요하면 **GSD Core**를 대안으로 검토.
- 총괄 워크플로는 하나부터 시작하고, 실제 기기 테스트와 서버 권한·만료·알림 검증 항목을 연결한다.

프레임워크의 검증은 구성한 테스트와 실행 환경을 바탕으로 한다. 실제 사용자 반응 수집, 실기기의 위치·푸시 권한 확인, 결제 계정 설정, 스토어 심사까지 자동으로 완료됐다고 간주할 수는 없다.

## 인기도·최근 활동 확인

GitHub API의 stargazers_count와 pushed_at을 조회했다. 날짜는 미국 로스앤젤레스 시간으로 변환했다. 별 수는 관심도이며 실제 사용 인원이 아니다. 마지막 push는 저장소 활동 지표이며 안정 버전 출시일이나 코드 품질을 의미하지 않는다. 수치는 조사 도중에도 바뀔 수 있다.

| 도구 / 저장소 | GitHub 별 수 | 최근 push (LA) | 판단 |
|---|---:|---|---|
| [Expo Skills](https://github.com/expo/skills) | 4,041 | 2026-11-01 | 앱 개발에 가장 직접적인 공식 도구 |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | 약 33,506 | 2026-10-28 | React Native 개별 스킬을 선택해서 사용 |
| [Supabase MCP](https://github.com/supabase/mcp) | 2,991 | 2026-11-03 | 데이터베이스·마이그레이션·서버 함수 연결 |
| [Supabase Agent Skills](https://github.com/supabase/agent-skills) | 2,999 | 2026-10-02 | Supabase·Postgres 지침 |
| [Supabase Plugin](https://github.com/supabase-community/supabase-plugin) | 44 | 2026-10-16 | 위 MCP와 스킬을 묶는 공식 설치 패키지 |
| [Context7](https://github.com/upstash/context7) | 64,165 | 2026-11-03 | 현재 라이브러리 문서 조회 |
| [Maestro](https://github.com/mobile-dev-inc/Maestro) | 16,309 | 2026-11-03 | 모바일 화면과 사용자 흐름 테스트 |
| [Mobile MCP](https://github.com/mobile-next/mobile-mcp) | 10,282 | 2026-11-02 | iOS·Android 기기·시뮬레이터 제어의 대안 |
| [Superpowers](https://github.com/obra/superpowers) | 약 312,040 | 2026-11-03 | 조사 후보 중 별 수가 가장 많은 범용 개발 워크플로 도구 |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 약 144,918 | 2026-11-03 | 디자인 시스템·UI 지침용 선택 도구 |
| [Callstack Agent Skills](https://github.com/callstackincubator/agent-skills) | 1,699 | 2026-10-08 | 성능·메모리 문제를 조사할 때 선택 |
| [RevenueCat AI Toolkit](https://github.com/RevenueCat/ai-toolkit) | 78 | 2026-11-03 | 실제 유료 구독을 구현할 때 선택 |

개별 스킬의 공개 설치 집계도 확인했다.

- [Vercel vercel-react-native-skills](https://skills.sh/vercel-labs/agent-skills/vercel-react-native-skills): 약 265.9K installs.
- [Callstack react-native-best-practices](https://skills.sh/callstackincubator/agent-skills/react-native-best-practices): 약 31.2K installs.
- 이 값은 skills.sh가 기록한 설치 이벤트다. Claude Code만의 활성 사용자 수나 전체 생태계의 절대 순위를 뜻하지 않는다. Vercel 저장소 별 수는 React Native 스킬 하나가 아닌 전체 모음의 별 수다.

## 도구별 적용

### Expo 공식 플러그인: 우선 설치

Expo 프로젝트 구조, Router, 네이티브 UI, 디자인 시스템, 데이터 조회, 개발 빌드 등의 스킬이 있다. MCP 설정도 함께 제공한다. 기기 기능의 실제 코드는 Expo SDK 등을 사용해 별도로 구현해야 한다.

앱에 특히 맞는 스킬은 expo-overview, expo-project-structure, expo-router, expo-native-ui, expo-design-system, expo-data-fetching, expo-dev-client다. 예전 글에서 사용하는 building-native-ui 등의 이름과 현재 공식 저장소의 이름이 다를 수 있으므로 현재 플러그인에서 확인한다.

MCP로 최신 문서 읽기, 호환 패키지 설치 안내, 빌드 로그 확인 등을 할 수 있다. 시뮬레이터 화면 캡처와 제어는 로컬 기능 설정이 추가로 필요하다. Expo 계정이 필요하며 일부 서버 도구와 서비스는 요금제 조건이 있다. 실험용 API를 마감 직전에 도입하는 것은 추천하지 않는다.

출처: [Expo Skills 공식 문서](https://docs.expo.dev/skills/), [Expo MCP 공식 문서](https://docs.expo.dev/mcp/), [현재 Expo Skills README](https://github.com/expo/skills).

### Supabase 공식 플러그인: 우선 설치

인증·방/멤버 데이터·Realtime·Storage·Edge Functions를 한 플랫폼에서 구성하는 방향을 제안한다. 공식 플러그인은 MCP와 Supabase/Postgres 스킬을 묶는다. 방 멤버만 메시지와 사진에 접근하도록 정책을 만들고, 만료 시각 이후 요청을 거절하도록 구현해야 한다.

이 앱에서 만료 예고는 **서버 예약 작업 → 알림 처리 함수 → 푸시 서비스**로 구현한다. Supabase Cron으로 주기적으로 대상을 찾고 Edge Function을 호출하는 구조를 제안한다. 전송 기록으로 중복을 막고, 만료 시간 변경 시 알림 기준도 갱신한다. 파일 정리는 데이터베이스 행 삭제와 별도로 구현한다.

MCP가 알아서 채팅·자동 만료를 완성하는 것은 아니다. 개발용 프로젝트를 연결하고 권한 정책과 삭제 작업을 검증한다.

출처: [공식 플러그인 설치](https://supabase.com/docs/guides/ai-tools/plugins), [MCP](https://supabase.com/docs/guides/ai-tools/mcp), [Cron](https://supabase.com/docs/guides/cron), [예약 함수](https://supabase.com/docs/guides/functions/schedule-functions), [Expo의 Supabase 가이드](https://docs.expo.dev/guides/using-supabase/).

### Vercel React Native 스킬: 우선 설치

채팅 메시지 목록, 사진 갤러리, 이미지 표시, 화면 전환, 네이티브 UI와 렌더링의 기본 지침에 유용하다. 개별 스킬 이름은 현재 SKILL.md의 **vercel-react-native-skills**다. README의 섹션 제목과 실제 스킬 식별자가 다르게 보일 수 있어 원본 파일을 확인했다.

출처: [현재 스킬 원본](https://github.com/vercel-labs/agent-skills/blob/main/skills/react-native-skills/SKILL.md), [설치 집계](https://skills.sh/vercel-labs/agent-skills/vercel-react-native-skills).

### Context7: 문서 조회용 선택 도구

라이브러리와 버전에 맞는 문서·코드 예시를 조회한다. Expo 공식 문서는 Expo MCP를 우선 사용하고, 다른 라이브러리에는 Context7을 활용하는 구성이 합리적이다. 현재 권장 설치 진입점은 ctx7 setup이며 CLI + Skills 또는 MCP 모드를 선택한다. CLI는 Node.js 22.13 이상을 요구한다.

출처: [현재 README와 설치 안내](https://github.com/upstash/context7).

### Maestro: 테스트용 선택 도구

가입·방 만들기·코드 참여·메시지 전송·사진 저장 등 중요한 흐름을 반복 테스트한다. CLI에 MCP 서버가 포함되어 있다. 현재 README 기준 Java 17 이상이 필요하며 iOS는 시뮬레이터를 사용한다. 물리 iOS 기기는 지원되지 않는다고 명시되어 있다. 실기기의 푸시·백그라운드 GPS 검증을 대신하지는 않는다.

실제 iPhone 제어까지 필요하면 Mobile MCP의 지원 범위와 추가 설정을 확인한다. Expo MCP, Maestro, Mobile MCP를 처음부터 전부 켜기보다는 필요한 기능을 제공하는 도구부터 사용한다.

출처: [Maestro GitHub](https://github.com/mobile-dev-inc/Maestro), [Claude Code용 MCP 설치](https://docs.maestro.dev/get-started/maestro-mcp), [Mobile MCP](https://github.com/mobile-next/mobile-mcp).

### Superpowers와 UI UX Pro Max: 선택

Superpowers는 설계·작업 분해·구현·검증의 범용 워크플로를 제공한다. 조사 후보 중 별 수가 가장 높지만 모바일 전용 도구는 아니다. 기존 기획을 기준으로 범위를 고정하고 작은 단위로 실행하는 용도로 선택할 수 있다. 설치했다고 개발 속도나 11월 8일 완료가 보장되지는 않는다.

UI UX Pro Max는 React Native도 지원하는 디자인 지침 도구다. 사용할 때 React Native/Expo를 명시해야 한다. README는 지정하지 않으면 HTML + Tailwind가 기본이라고 안내한다. 현재 와이어프레임을 기준으로 디자인을 고정하고 통일감을 다듬는 용도가 적합하다.

출처: [Superpowers README](https://github.com/obra/superpowers), [UI UX Pro Max README](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).

### RevenueCat AI Toolkit: 실제 구독 기능을 만들 때

공식 플러그인·스킬·MCP·CLI로 구독 상품, 권한, 페이월, React Native Purchases SDK 연결을 돕는다. 결제와 앱스토어 상품 설정은 별도 작업이다. 앱의 유료 기능 요구사항은 유지하되 마감 전 핵심 흐름이 먼저 안정화되도록 우선순위를 판단한다.

출처: [RevenueCat AI Toolkit 공식 문서](https://www.revenuecat.com/docs/tools/ai-toolkit), [GitHub](https://github.com/RevenueCat/ai-toolkit).

## 확인한 기본 설치 명령

다음은 **Claude Code가 설치되어 있는 환경**에서 실행할 참고 명령이다. 이 조사에서 실행한 설치 명령은 없다. 일반 Claude 채팅에 그대로 붙여넣는 방식과 구분한다.

터미널에서:

```bash
cd /Users/hyeonminyang/Desktop/IYA_Project
claude plugin install expo@claude-plugins-official
claude plugin install supabase@claude-plugins-official
npx skills@latest add vercel-labs/agent-skills --skill vercel-react-native-skills --agent claude-code
```

공식 마켓플레이스가 없는 경우 Supabase 문서의 안내:

```bash
claude plugin marketplace add anthropics/claude-plugins-official
```

Claude Code 안에서 `/reload-plugins` 또는 세션 재시작으로 플러그인을 활성화하고, `/mcp`로 연결 상태와 Expo/Supabase 인증을 확인한다. 플러그인이 등록한 MCP를 수동으로 중복 추가하지 않는다.

Context7을 추가하려면:

```bash
npx ctx7 setup --claude
```

Maestro CLI를 설치하고 시뮬레이터를 준비한 뒤 MCP를 연결하려면:

```bash
claude mcp add maestro -- maestro mcp
```

Superpowers를 선택한다면 Claude Code 안에서:

```text
/plugin install superpowers@claude-plugins-official
```

출처: [Expo 설치](https://docs.expo.dev/skills/), [Supabase 설치](https://supabase.com/docs/guides/ai-tools/plugins), [Vercel 스킬](https://skills.sh/vercel-labs/agent-skills/vercel-react-native-skills), [skills CLI 저장소](https://github.com/vercel-labs/skills), [Context7 설치](https://github.com/upstash/context7), [Maestro 설치](https://docs.maestro.dev/get-started/maestro-mcp), [Superpowers 설치](https://github.com/obra/superpowers).

## 마감에 영향을 주는 검증 항목

1. **개발용 앱 빌드를 첫날 준비한다.** Android 원격 푸시는 SDK 53부터 Expo Go에서 지원되지 않는다. iOS 백그라운드 위치도 Expo Go에서 지원되지 않는다. 두 기능을 시연하려면 Expo Go 화면만으로 개발 완료를 판단하면 안 된다.
2. **공개 출시와 시연 가능한 MVP를 구분한다.** 이 일정은 테스트 기기에 설치해서 핵심 흐름을 검증하는 MVP를 기준으로 제안한다. 스토어 심사 완료일을 확약하는 일정은 아니다.
3. **알림은 실제 폰에서 검증한다.** 만료 예고는 서버가 발송하고, 만료 시각 변경과 퇴장자의 제외를 테스트한다. 개발 환경에서는 시계를 압축해 예약 처리 경로를 검증하되 실제 24시간 조건의 확인을 대신했다고 표현하지 않는다.
4. **원본 사진과 갤러리 캐시를 구분한다.** 미리보기와 원본 저장·다운로드를 각각 확인한다.
5. **얼굴 매칭과 결제는 별도의 검증이 필요하다.** 얼굴 검출과 본인 얼굴 일치 판정은 서로 다른 기능이다. SDK 설치나 화면 완성만으로 구현 완료로 간주하지 않는다.

출처: [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [Expo Location](https://docs.expo.dev/versions/latest/sdk/location/).

## 11월 4일~8일 우선순위 제안

| 날짜 | 우선 작업 / 확인 결과 |
|---|---|
| 11/4 | 도구 설정, 앱 뼈대, 인증, 기기에 설치되는 개발 빌드. 두 기기 연결 환경 확보. |
| 11/5 | 방 생성, QR/코드 입장, 실시간 메시지. 실제 두 사용자가 같은 방에서 대화. |
| 11/6 | 원본 사진·업로더 분류, 서버 만료 접근 차단, 24시간 전 알림 처리와 실제 폰 푸시. |
| 11/7 | 스포츠 위치·상태·경로의 핵심 흐름. 동의 해제·활동 종료·퇴장 시 공유 중단 검증. |
| 11/8 | 기능 추가를 멈추고 두 기기 검증, 실패 동작 수정, 실제 모임 테스트와 시연 영상 준비. |

실제 작업 가능 시간과 개발 경험을 모르는 상태의 제안이다. 전체 기능을 같은 수준으로 완성할 수 있다는 견적이 아니다. 기존 요구사항 중 얼굴 매칭·결제·백그라운드 위치 안정화의 완료 수준은 별도로 정해야 한다.

## Claude Code에 전달할 시작 지시 예시

프로젝트의 planning/APP_CONCEPT_KO.md와 output/pdf/Moment_All_Wireframes.pdf를 먼저 읽어라. 목표는 2026-11-08까지 iOS·Android 기기에서 시연할 수 있는 일시적 그룹 채팅 MVP다. React Native + Expo + TypeScript를 사용하고, 백엔드는 Supabase를 우선 검토한다. 영어 UI를 유지한다.

설치된 Expo 스킬과 vercel-react-native-skills를 먼저 확인하고, Supabase 관련 작업에는 공식 Supabase 스킬과 MCP를 사용하라. 현재 안정 버전과 호환되는 패키지를 확인하고 Expo 패키지는 Expo의 호환 버전 설치 방식을 사용하라. 기획서가 제품 요구사항의 기준이며 스킬의 예시가 제품 범위를 임의로 바꾸게 하지 마라.

코드 작성 전에 앱 실행 환경과 필요한 계정·시뮬레이터·테스트 기기를 확인하고, 먼저 기기에 설치 가능한 개발 빌드를 확보하라. 계정 → 방 생성 → QR/코드 참여 → 두 기기 실시간 채팅 → 원본 사진 → 만료 및 만료 24시간 전 알림을 작은 단위로 구현하고 실제 동작을 확인하라. 스포츠 기능에서는 방 설정·개인 동의·기기 권한·활동 시작 조건을 모두 적용하라.

만료된 방은 데이터 정리 작업의 실행 여부와 관계없이 서버 권한 검사에서 차단하라. 원본 파일 정리와 데이터베이스 삭제를 구분하라. 만료 24시간 전 알림은 서버에서 예약하고 중복 전송과 만료 시각 변경을 처리하라. 화면에 샘플 데이터를 보이는 것과 실제 기능이 작동하는 것을 구분해서 보고하라.

얼굴 매칭과 실제 결제 등 완료 수준이 불확실한 기능은 핵심 흐름의 진행 상황과 함께 별도 계획으로 제시하라. 모든 기능의 목표는 유지하되, 마감 전에 실제로 검증 가능한 범위를 분명하게 표시하라.
