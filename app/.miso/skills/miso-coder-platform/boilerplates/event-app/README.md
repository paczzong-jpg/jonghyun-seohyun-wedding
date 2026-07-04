# event-app (boilerplate)

행사 운영 앱 시작점. 코더 템플릿(Vite + React Router + PocketBase + MISO SDK) 위에 얹는 오버레이다.

포함 범위:

- 행사 랜딩, 일정, 사전 신청
- QR/행사 코드 체크인
- 세션별 라이브 Q&A
- 진행자 제어형 라이브 퀴즈
- 체크인 참가자 전용 경품추첨
- 운영자 콘솔
- 발표자 화면(Q&A, Quiz, Draw)

## 파일 구조

```text
api/
  setup_event_collections.mjs       PocketBase 컬렉션 생성/갱신 스크립트
  event_hooks.pb.js                 참가 신청 확인 메일 hook

src/App.tsx                         라우터 + EventShell

src/pages/
  EventLandingPage.tsx              행사 소개 + 일정
  RegisterPage.tsx                  사전 신청
  JoinPage.tsx                      QR/코드 체크인
  QnaPage.tsx                       세션별 Q&A
  QuizPage.tsx                      참가자 라이브 퀴즈
  DrawPage.tsx                      참가자 경품추첨 대기/당첨 확인
  AdminPage.tsx                     운영 콘솔
  PresenterPage.tsx                 발표자 화면(Q&A/Quiz/Draw)

src/components/event/
  join-qr-card.tsx                  참가 URL + QR + 행사 코드
  join-checkin-form.tsx             현장 체크인 폼
  participant-home.tsx              참가자 모바일 홈
  qna-board.tsx / qna-input.tsx     라이브 Q&A
  quiz-admin-panel.tsx              진행자 퀴즈 제어
  quiz-participant-panel.tsx        참가자 퀴즈 응답
  quiz-presenter-panel.tsx          큰 화면 퀴즈 표시
  quiz-leaderboard.tsx              점수/순위 표시
  quiz-answer-distribution.tsx      선택지별 응답 집계
  draw-admin-panel.tsx              경품추첨 제어
  draw-presenter-panel.tsx          당첨자 발표 화면

src/lib/
  event-data.ts                     PocketBase CRUD/realtime + fallback
  event-seed-data.ts                MISO 팀 기준 데모 데이터
  event-types.ts                    이벤트 타입
  quiz-state.ts                     점수/순위 계산
  draw-state.ts                     추첨 후보/당첨자 선택
  qr-code.ts                        참가 URL/QR 이미지 URL
  participant-session.ts            체크인 참가자 localStorage
```

## 라우트

| Route | 용도 |
|---|---|
| `/` | 행사 랜딩 |
| `/register` | 사전 신청 |
| `/join/:eventCode` | QR/코드 체크인 |
| `/qna` | 참가자 Q&A |
| `/quiz` | 참가자 라이브 퀴즈 |
| `/draw` | 참가자 경품추첨 상태 |
| `/admin` | 운영자 콘솔 |
| `/presenter` 또는 `/presenter/qna` | Q&A 발표자 화면 |
| `/presenter/quiz` | 퀴즈 발표자 화면 |
| `/presenter/draw` | 경품추첨 발표자 화면 |

## PocketBase 컬렉션 설정

컬렉션은 브라우저 코드에서 만들지 않는다. 생성 앱에서 아래 명령을 실행한다.

```bash
node api/setup_event_collections.mjs
```

필요한 환경변수:

- `SM_INTERNAL_URL`
- `RUNTIME_APP_ID` 또는 `RUNTIME_CODEBASE_ID`
- `EVENT_CODE` (선택, 기본값: `miso-live-2026`)

스크립트는 다음 컬렉션을 생성하거나 full schema PATCH로 갱신한다.

- `participants`
- `questions`
- `quiz_sessions`
- `quiz_questions`
- `quiz_players`
- `quiz_answers`
- `draw_prizes`
- `draw_winners`

컬렉션 생성 후 비어 있는 경우 참가자, 기본 퀴즈 세션/문항, 경품 seed도 넣는다. 그래서 새 Coder 앱에서도 `/admin`, `/presenter/quiz`, `/presenter/draw`가 바로 동작한다.

모든 컬렉션은 public generated app 접근을 위해 API Rules를 명시적 빈 문자열로 둔다. 실제 운영에서 관리자 제한이 필요하면 `pocketbase/auth` recipe로 `/admin` 게이트를 추가하고 rules를 조정한다.

## 라이브 퀴즈 운영

운영자 `/admin`의 `Quiz` 탭에서 퀴즈 상태를 제어한다.

상태 흐름:

```text
lobby -> question -> locked -> reveal -> leaderboard -> question ... -> finished
```

참가자는 `/join/:eventCode`에서 체크인 후 `/quiz`로 들어간다. 진행자가 다음 문제를 공개하면 참가자 화면과 발표자 화면이 같은 `quiz_sessions.status`를 기준으로 갱신된다.

점수 계산:

```text
오답 = 0점
정답 = basePoints + speedBonusPoints * (1 - responseMs / timeLimitMs)
```

기본 문제는 `event-seed-data.ts`에 있으며, 실제 행사용 문제는 `quiz_questions` 컬렉션으로 관리한다.

## 경품추첨 운영

경품추첨 후보는 항상 `participants.checkedIn = true`인 참가자만 포함한다. 이미 당첨된 참가자는 기본 제외한다.

운영자 흐름:

1. `/admin`의 `Draw` 탭에서 경품을 선택한다.
2. `추첨 시작`을 누른다.
3. 당첨 결과가 `draw_winners`에 저장된다.
4. `/presenter/draw`에 최신 당첨자가 표시된다.

## 데모 데이터

fallback/demo 데이터는 실제 MISO 팀 구성에 맞춘다.

- Ally
- Young: 기획자, MISO PO
- Eugene: FE 개발
- Kade: BE 개발
- Han: SRE
- Heather: UI/UX

PocketBase 컬렉션이 있으면 실제 DB 데이터가 우선이고, 컬렉션이 없을 때만 fallback 데이터로 화면을 표시한다.

## 메일 발송

`api/event_hooks.pb.js`는 `participants` 생성 후 확인 메일을 보낼 수 있다.

환경변수:

```text
RESEND_API_KEY=re_xxxxxxxxxxxx
```

키가 없으면 개발 환경으로 보고 메일 발송을 생략한다.

## 조합한 recipe

| recipe | 용도 |
|---|---|
| `pocketbase/crud` | 참가자, Q&A, 퀴즈, 추첨 데이터 |
| `pocketbase/realtime` | Q&A/퀴즈/추첨 live 갱신 |
| `pocketbase/files` | 경품 이미지 |
| `messaging/mail` | 참가 신청 확인 메일 |
| `pocketbase/auth` | 운영자 콘솔 게이트 |

## 규칙

- shadcn은 `@/components/ui/*`에서 직접 import한다.
- `pb`는 `@/lib/miso-sdk/runtime-client`를 사용한다.
- 컬렉션 schema 변경은 `api/setup_event_collections.mjs` 또는 내부 runtime API로 한다.
- 브라우저 코드에서 컬렉션을 생성/수정하지 않는다.
- 새 패키지를 추가하지 않는다.
