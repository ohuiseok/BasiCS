# BasiCS

Java/Spring 백엔드 개발자를 위한 CS 학습 앱입니다. 개념 학습, 면접형 문제 풀이, 북마크, 학습 통계를 한 흐름으로 묶어 “읽고 끝나는 CS”가 아니라 다시 꺼내 보고 점검할 수 있는 모바일 학습 경험을 목표로 만들었습니다.

## 화면 미리보기

| 학습 | 문제 | 북마크 | 통계 |
| --- | --- | --- | --- |
| <img src="./release/phone-screenshots/02-learning.png" width="180" alt="Learning screen" /> | <img src="./release/phone-screenshots/03-problems.png" width="180" alt="Problems screen" /> | <img src="./release/phone-screenshots/04-bookmarks.png" width="180" alt="Bookmarks screen" /> | <img src="./release/phone-screenshots/05-stats.png" width="180" alt="Stats screen" /> |

## 주요 기능

- **CS 개념 학습**: 운영체제, 네트워크, 데이터베이스, 보안, 성능, 신뢰성 등 백엔드 면접과 실무에 가까운 주제를 단계별로 학습합니다.
- **경력 단계별 문제**: 입문부터 10년차까지 난이도와 관점을 나누어 질문을 탐색하고 답변을 확인합니다.
- **Mermaid 기반 다이어그램**: 복잡한 흐름은 텍스트만이 아니라 구조도와 단계형 설명으로 이해할 수 있게 구성했습니다.
- **학습 상태 저장**: 문제 상태, 북마크, 학습 완료 기록, 연속 학습일을 로컬에 저장합니다.
- **오프라인 친화 데이터 로딩**: 앱에 포함된 seed index를 먼저 보여주고, 원격 JSON과 로컬 캐시를 백그라운드에서 동기화합니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 앱 | Expo, React Native, TypeScript |
| 내비게이션 | React Navigation Bottom Tabs, Native Stack |
| 저장소 | AsyncStorage, Expo FileSystem |
| 시각화 | Mermaid, react-native-svg, WebView |
| 광고 | react-native-google-mobile-ads |
| 빌드 | Android native project, Gradle, custom APK build scripts |

## 앱 구조

```mermaid
flowchart TD
  App["App.tsx"] --> DataProvider["데이터 공급자"]
  App --> StudyProvider["학습 상태 공급자"]
  StudyProvider --> Nav["내비게이션 컨테이너"]

  Nav --> Tabs["하단 탭"]
  Tabs --> Home["홈"]
  Tabs --> Learn["학습 스택"]
  Tabs --> Problem["문제 스택"]
  Tabs --> Library["북마크"]
  Tabs --> Stats["통계"]

  Learn --> LearnHome["학습 홈"]
  Learn --> Domain["학습 영역"]
  Learn --> Topic["학습 토픽"]
  Learn --> Reader["학습 본문"]

  Problem --> ProblemHome["문제 홈"]
  Problem --> Level["레벨별 문제 목록"]
  Nav --> Question["질문 화면"]
  Nav --> Answer["답변 화면"]
```

## 데이터 로딩 흐름

```mermaid
sequenceDiagram
  participant App as 앱
  participant Seed as 내장 seed index
  participant Remote as S3 JSON 데이터셋
  participant Cache as FileSystem / AsyncStorage 캐시

  App->>Seed: 학습/문제 인덱스를 즉시 로딩
  Seed-->>App: 바로 사용할 수 있는 첫 화면 렌더링
  App->>Remote: 최신 콘텐츠를 백그라운드에서 요청
  Remote-->>Cache: 버전이 있는 JSON 파일 저장
  Cache-->>App: 데이터 버전 갱신
  App->>Cache: 네트워크 실패 시 캐시로 복구
```

## 프로젝트 구조

```text
src/
  App.tsx                    # 내비게이션 루트와 전역 provider
  components/                # 카드, 칩, 진행률, 다이어그램 등 공통 UI
  data/                      # seed index, 원격 동기화, 캐시 로더
  screens/                   # 홈, 학습, 문제, 답변, 통계, 북마크 화면
  state/                     # 학습 진행도와 북마크 상태
  theme.ts                   # 공통 색상/반경 토큰

release/
  phone-screenshots/         # 포트폴리오용 스크린샷
  README.txt                 # APK 릴리즈 메모

scripts/
  build-apk.js
  build-apk-fast.js
```

## 설계 포인트

- **빠른 첫 화면**: 전체 학습 JSON을 기다리지 않고 seed index를 먼저 로딩해 앱 진입 시간을 줄였습니다.
- **캐시 우선 복구**: 원격 데이터 로딩에 실패하면 이전에 저장된 JSON 캐시를 사용해 학습 흐름을 유지합니다.
- **레벨 중심 탐색**: 문제 데이터는 입문~10년차 레벨로 나누어 사용자가 자신의 현재 위치에 맞춰 접근할 수 있게 했습니다.
- **학습과 문제의 분리**: 개념을 읽는 흐름과 답변을 연습하는 흐름을 탭/스택 단위로 분리해 반복 사용성을 높였습니다.

## 실행 방법

```bash
npm install
npm run start
```

Android 실행:

```bash
npm run android
```

타입 체크:

```bash
npm run typecheck
```

APK 빌드:

```bash
npm run build:apk
```

## 환경 변수와 민감 파일

AdMob 값과 릴리즈 서명 파일은 Git에 포함하지 않습니다.

```text
.env
release/signing-backup/
*.keystore
*.jks
release-signing.properties
```

필요한 환경 변수 예시는 아래와 같습니다.

```text
ADMOB_ANDROID_APP_ID=
ADMOB_IOS_APP_ID=
EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID=
EXPO_PUBLIC_ADMOB_BANNER_ID_IOS=
```

## 포트폴리오에서 보여줄 점

- React Native 앱에서 학습 콘텐츠, 문제 풀이, 통계, 북마크를 하나의 사용자 여정으로 설계
- seed data, remote JSON, local cache를 조합한 데이터 동기화 구조 구현
- Mermaid 다이어그램을 모바일 화면에서 보여주는 학습 보조 UI 구성
- Android 릴리즈 빌드와 서명 파일 관리 흐름 정리
