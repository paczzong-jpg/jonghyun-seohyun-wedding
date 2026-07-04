# meeting (boilerplate)

**브라우저 로컬 Whisper(WASM/WebGPU) STT** 기반 프리미엄 **AI 회의록** 앱의 template-grade 시작점.
**Vite + React + PocketBase + Direct LLM(miso-sdk) + transformers.js** 오버레이다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn), `src/lib/miso-sdk/`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다.

---

## 무엇이 되는가 (전부 실동작)

| 영역 | 기능 |
|------|------|
| 녹음 | 다크 스테이지 포커스 모드 — 대형 타이머·캔버스 파형·일시정지/재개. **녹음 중 ~25초 단위 라이브 전사** 표시 |
| STT | **Whisper 브라우저 로컬 실행** (음성이 서버로 안 나감). WebGPU 자동 감지 → WASM 폴백. 다국어(자동감지+8개 언어 선택). 모델 다운로드 진행률 표시 |
| 업로드 | 기존 녹음 파일(m4a/mp3/wav/webm…) 업로드 → 전체 전사. **미리보기 iframe 마이크 차단 시의 공식 대체 경로** |
| 화자 분리 | pyannote(브라우저 로컬)로 화자 판별 — **2명 이상 감지될 때만 자동 노출**, 화자 라벨 클릭 → 이름 일괄 지정 |
| 오디오 | 원본을 PB `file` 로 보존 → `<audio>` 프로그레시브 스트리밍 재생(배속·±10초·다운로드), 하단 도킹 플레이어 |
| 트랜스크립트 | **재생 위치 동기 하이라이트 + 자동 팔로우**(수동 스크롤 시 해제·복귀 버튼), **라인 클릭 → 해당 지점 재생**, 검색(이전/다음), 전체 복사 |
| 회의록 | **템플릿(섹션+지침) 기반 LLM 생성** — 프리셋 5종 + 사용자 템플릿 CRUD, 템플릿 바꿔 재생성, 마크다운 편집, 섹션 TOC, [mm:ss] 인용 칩 → 클릭 시 오디오 시크, .md 다운로드 |
| 내 노트 | AI 산출물과 분리된 사용자 메모 탭 (자동 저장) |
| AI 채팅 | 트랜스크립트+첨부자료 근거 스트리밍 Q&A — 답변의 **[mm:ss] 인용 칩 → 재생 시크**, 중단, 기록 저장/비우기 |
| 첨부자료 | PDF·DOCX·MD·TXT·CSV 업로드 → 원본 재다운로드 + **텍스트 추출본이 회의록·채팅의 AI 소스로 합류** |
| 공유 | 토큰 링크 `/share/:token` — **회의록 렌더 결과만** 노출(앱 크롬·트랜스크립트·오디오 비공개), 링크 해제 |
| 대시보드 | 회의 라이브러리(상태 배지·길이·참석자·태그), **제목·참석자·태그 + 트랜스크립트·회의록 본문 전역 검색**, PB realtime 라이브 갱신 |
| 품질 | 다크모드(시스템 감지+토글), 모든 빈/로딩/에러/처리중 상태, 실패 시 "다시 시도", sonner 토스트 |

**계약상 한계** (README 를 읽는 AI 는 사용자에게 이대로 안내할 것):
- STT 는 **열려 있는 브라우저 탭에서** 실행된다 — 전사·회의록 생성 중 탭을 닫으면 중단된다(재개 버튼 제공). 서버 배치 전사는 플랫폼에 없다.
- 녹음 원본은 종료 시점에 업로드된다 — 녹음 도중 탭이 죽으면 오디오는 유실된다(레퍼런스 데스크톱 앱들도 동일).
- 화자 분리는 세그먼트 단위 근사다 — 화자 임베딩 클러스터링이 없어 아주 긴 녹음에서 화자 번호가 뒤섞일 수 있다. 이름 수동 지정 UI 로 보완.
- 시스템(탭) 오디오 캡처는 미포함 — 마이크 녹음과 파일 업로드만.
- 모델 첫 로드는 다운로드(whisper-base 약 100~145MB)가 필요하다. 이후 브라우저 Cache API 에 캐시된다.

## 파일 구성

```
src/App.tsx                                   라우팅( /, /record, /meeting/:id, /share/:token ) — 템플릿 App 대체
src/pages/DashboardPage.tsx                   회의 라이브러리·전역 검색·업로드 CTA
src/pages/RecordPage.tsx                      녹음 스테이지·라이브 전사·마무리 파이프라인
src/pages/MeetingPage.tsx                     상세 셸(회의록/트랜스크립트·채팅·자료)·처리 소유·공유
src/pages/SharePage.tsx                       공유 뷰 — 회의록 렌더 전용
src/lib/meeting-config.ts                     ★ 교체 지점 — 앱명·모델 ID·언어·템플릿 프리셋
src/lib/meeting/
  types.ts                                    도메인 타입(PB 필드와 1:1) + 워커 프로토콜 타입
  db.ts                                       PB CRUD (mn_*), batch 세그먼트 쓰기, realtime 구독, 검색
  audio.ts                                    MeetingRecorder(원본+16kHz PCM 병행)·리샘플·마이크 진단
  stt-worker.ts                               Web Worker — whisper 전사 + pyannote 화자 분리
  stt.ts                                      워커 클라이언트(직렬 큐·transferable)·화자 병합
  process.ts                                  처리 파이프라인(전사→화자→저장→회의록)·재개
  llm.ts                                      Direct LLM — 회의록 생성·채팅·[mm:ss] 인용
  ingest.ts                                   첨부 텍스트 추출(pdf.js·mammoth)·청크
  use-theme.ts                                다크모드
src/components/meeting/
  markdown.tsx                                마크다운 렌더 + [mm:ss]→시크 칩
  audio-player.tsx                            useAudioPlayer 훅 + 도킹 플레이어 바
  transcript-panel.tsx                        동기 뷰어(하이라이트·팔로우·검색·화자 rename)
  minutes-panel.tsx                           회의록 문서(TOC·편집·재생성·다운로드) + 내 노트
  chat-panel.tsx                              AI 채팅(스트리밍·인용 칩)
  attachments-panel.tsx                       첨부 업로드·다운로드·상태
  template-dialog.tsx                         템플릿 관리(섹션 편집)
src/styles/meeting.css                        디자인 시스템 — 시맨틱 토큰 오버라이드(라이트/다크)
```

## 의존성

```bash
pnpm add @huggingface/transformers@4.2.0 react-markdown@9.0.1 remark-gfm@4.0.0 pdfjs-dist@4.10.38 mammoth@1.8.0
```

- `@huggingface/transformers` 는 **워커에서만** import 된다(메인 번들 무관). pdf.js·mammoth 는 첨부 인제스트 시점에만 dynamic import.
- 모델 가중치는 npm 이 아니라 **사용자 브라우저가 HuggingFace CDN 에서 직접** 받는다 — 워커 fetch 는 플랫폼 인터셉터를 타지 않고, CORS 는 HF 가 허용한다. un-gated 미러(`onnx-community/*`)만 사용할 것 (원본 `pyannote/*` 는 gated 라 브라우저 로드 실패).

## PocketBase 컬렉션 생성 (필수 — 오버레이 직후 실행)

고정 collection id 를 사용하므로 아래 curl 을 **순서대로 그대로** 실행하면 된다 (id 파싱 불필요).
규칙: API rules 는 반드시 `""`, 모든 컬렉션에 `created`/`updated` autodate 포함(정렬 400 방지).

```bash
# 1. 회의
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"mncolmeetings01","name":"mn_meetings","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"title","type":"text"},
    {"name":"status","type":"text","required":true},
    {"name":"audio","type":"file","maxSelect":1,"maxSize":536870912},
    {"name":"duration","type":"number"},
    {"name":"language","type":"text"},
    {"name":"participants","type":"json"},
    {"name":"tags","type":"json"},
    {"name":"minutes_md","type":"text","max":100000},
    {"name":"template","type":"text"},
    {"name":"my_notes","type":"text","max":100000},
    {"name":"speaker_names","type":"json"},
    {"name":"origin","type":"text"},
    {"name":"color","type":"text"},
    {"name":"error","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 2. 트랜스크립트 세그먼트
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"mncolsegments01","name":"mn_segments","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"meeting","type":"relation","required":true,"collectionId":"mncolmeetings01","cascadeDelete":true,"maxSelect":1},
    {"name":"idx","type":"number"},
    {"name":"start","type":"number"},
    {"name":"end","type":"number"},
    {"name":"text","type":"text","max":10000},
    {"name":"speaker","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 3. 회의록 템플릿
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"mncoltemplates1","name":"mn_templates","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"name","type":"text","required":true},
    {"name":"description","type":"text"},
    {"name":"sections","type":"json"},
    {"name":"builtin","type":"bool"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 4. 첨부자료
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"mncolattachmnt1","name":"mn_attachments","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"meeting","type":"relation","required":true,"collectionId":"mncolmeetings01","cascadeDelete":true,"maxSelect":1},
    {"name":"title","type":"text","required":true},
    {"name":"file","type":"file","maxSelect":1,"maxSize":104857600},
    {"name":"status","type":"text"},
    {"name":"char_count","type":"number"},
    {"name":"error","type":"text"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 5. 첨부 텍스트 청크 (본문은 4천자 청크 분산 — text 필드 대용량 저장 금지 규칙 준수)
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"mncolattchunks1","name":"mn_attachment_chunks","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"attachment","type":"relation","required":true,"collectionId":"mncolattachmnt1","cascadeDelete":true,"maxSelect":1},
    {"name":"meeting","type":"relation","required":true,"collectionId":"mncolmeetings01","cascadeDelete":true,"maxSelect":1},
    {"name":"idx","type":"number"},
    {"name":"text","type":"text","max":100000},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 6. 채팅 메시지
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"mncolchatmsgs01","name":"mn_chat_messages","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"meeting","type":"relation","required":true,"collectionId":"mncolmeetings01","cascadeDelete":true,"maxSelect":1},
    {"name":"role","type":"text","required":true},
    {"name":"content","type":"text","max":100000},
    {"name":"citations","type":"json"},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'

# 7. 공유 링크
curl -s ${SM_INTERNAL_URL}/internal/coder/runtime/${RUNTIME_APP_ID}/data/api/collections \
  -H "Content-Type: application/json" -d '{
  "id":"mncolshares0001","name":"mn_shares","type":"base",
  "listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"",
  "fields":[
    {"name":"meeting","type":"relation","required":true,"collectionId":"mncolmeetings01","cascadeDelete":true,"maxSelect":1},
    {"name":"token","type":"text","required":true},
    {"name":"created","type":"autodate","onCreate":true,"onUpdate":false},
    {"name":"updated","type":"autodate","onCreate":true,"onUpdate":true}
  ]}'
```

> 컬렉션 **수정** 시 `PATCH /collections/<id>` 는 `fields` 를 통째로 교체한다 — 반드시 기존 필드 전체 + 신규 필드를 함께 보낼 것.
> `mn_meetings.template` 은 의도적으로 **text**(id 문자열)다 — relation 으로 바꾸면 템플릿 삭제가 막히거나 회의가 연쇄 삭제될 수 있다.

## ★ 필수 교체 — `src/lib/meeting-config.ts`

| 항목 | 현재값 | 교체 |
|------|--------|------|
| `APP_NAME` / `APP_TAGLINE` | `"Scribe"` | 서비스 이름·소개 |
| `ASR_MODEL_ID_WEBGPU` | `onnx-community/whisper-base` | 품질↑ 필요 시 `whisper-small` 계열 (용량 3배·속도↓) |
| `ASR_MODEL_ID_WASM` | `Xenova/whisper-base` | WASM 검증 export — 바꿀 때 반드시 E2E 재검증 |
| `TEMPLATE_PRESETS` | 프리셋 5종 | 조직 양식에 맞게 (선택) |
| `LANGUAGES` / `LIVE_WINDOW_SEC` | 8개 언어 / 25초 | 필요 시 조정 (선택) |

## 아키텍처 노트 (수정 시 반드시 이해할 것)

- **STT 워커 계약**: transformers.js 는 `stt-worker.ts` 안에서만 import 한다. 메인스레드 import 는 번들·프리징 문제를 만든다. 워커 호출은 `stt.ts` 의 `getStt()` 싱글턴 경유 — 요청 직렬 큐·transferable 이 전제라 워커를 직접 만들지 말 것.
- **모델 다운로드 경로**: 워커 fetch 는 플랫폼 `__external` 인터셉터를 **타지 않는다**(인터셉터는 메인스레드 전용). HF CDN 직결이 정상 경로다. 방화벽 등으로 HF 접근이 막힌 환경이면 모델 로드가 실패하며, 이는 플랫폼 프록시로 우회할 수 없다.
- **양자화/디바이스 (실측으로 확정 — 임의 변경 금지)**: WebGPU(실 GPU, `isFallbackAdapter` 제외)는 `onnx-community/whisper-base` 인코더 `fp32`+디코더 `q4`. WASM 폴백은 `Xenova/whisper-base` `q8`(파일별 dtype 객체) + **`session_options.graphOptimizationLevel: "basic"` 필수** — 기본(all)에서는 ort-web 의 qdq 패스(TransposeDQWeightsForMatMulNBits)가 whisper 디코더의 양자화 embed_tokens 에서 세션 생성에 실패한다. onnx-community export 는 WASM 에서 모든 dtype 이 같은 오류로 깨진다(fp32 파일 부재로 양자화 그래프 폴백). 조합이 실패해도 `loadAsrWithFallback` 체인이 다음 조합으로 넘어간다. 타임스탬프는 **세그먼트 단위**(`return_timestamps: true`)만 사용 — 단어 단위는 드리프트 이슈로 채택하지 않았다.
- **PB batch 전제**: 플랫폼 PB 는 batch API enabled(maxRequests 50)다. `createSegments` 의 50개 청크는 이 한도에 정확히 맞춘 값 — 늘리지 말 것. ("Batch requests are not allowed" 오류가 나면 런타임 batch 설정 문제다.)
- **라이브 전사**: 녹음 중 `LIVE_WINDOW_SEC` 만큼 쌓일 때마다 그 구간을 배치 전사하고 오프셋을 보정해 이어붙인다. 재전사 최종 패스는 없다(윈도우 경계에서 단어가 끊길 수 있으나 수용). WASM 폴백에서는 라이브가 실시간을 못 따라갈 수 있다 — 경고만 표시하고 녹음 원본은 계속 보존된다.
- **처리 소유권**: 전사·회의록 생성은 시작한 탭이 소유한다. 업로드 직후 자동 처리는 `sessionStorage` 핸드오프(`markForProcessing`)로 MeetingPage 가 이어받고, 끊긴 회의는 상태 배너의 "전사 시작/다시 시도" 버튼으로 재개한다.
- **미리보기 iframe 마이크 차단**: 코더 에디터 미리보기 iframe 은 microphone permissions policy 가 없어 `getUserMedia` 가 항상 거부된다. `describeMicError` 가 이를 감지해 "새 탭에서 열기"를 안내한다 — 이 UX 를 제거하지 말 것. 발행된 사이트/새 탭에서는 정상.
- **타임스탬프 인용 규약**: LLM 컨텍스트는 `[mm:ss] 화자: 내용` 라인 형식(`buildTranscriptContext`, 30k자 예산·초과 시 앞 70%/뒤 30%)이고, 프롬프트가 `[mm:ss]` 인용을 강제한다. `markdown.tsx` 가 이를 시크 칩으로 렌더한다. **컨텍스트 라인 형식을 바꾸면 인용 추출(`extractTimeCitations`)·칩 렌더까지 함께 바꿔야 한다.**
- **화자 분리 판정**: pyannote 결과에서 화자 2명 이상일 때만 세그먼트에 라벨을 병합한다(`applySpeakerTurns`). 실패·1명·90분 초과는 조용히 화자 없이 진행 — 요구사항 "가능하다고 판별되는 경우 제공"의 구현이다.
- **세그먼트 대량 쓰기**: `createSegments` 는 PB batch API 50개 단위다. 낱개 create 로 바꾸면 1시간 회의(수백 세그먼트)에서 수십 초가 걸린다.
- **webm duration**: MediaRecorder webm 은 duration 메타데이터가 없어 `audio.duration` 이 `Infinity` 로 뜬다 — `useAudioPlayer` 의 큰 값 시크 트릭과 `duration` 필드 폴백을 유지할 것.
- **PB 동시 요청**: 같은 컬렉션 병렬 조회는 반드시 `$autoCancel:false` (기존 코드 패턴 유지).

## 사용법

1. **파일 배치**: 위 파일들을 동일 경로에 복사(`src/App.tsx` 는 교체). 의존성 설치.
2. **컬렉션 생성**: 위 curl 7개 실행 → `.miso/bin/pb-typegen` (선택).
3. **브랜딩**: `meeting-config.ts` 교체.
4. **검증**: 오디오 업로드 → 전사 진행률 → 트랜스크립트 클릭 시크 → 회의록 생성 → [mm:ss] 칩 시크 → 공유 링크 열기까지 확인. 마이크 녹음은 미리보기 새 탭에서.

## 규칙 (템플릿 규칙 준수)

- shadcn 은 `@/components/ui/*` 직접 import, `cn()` 은 `@/lib/utils`. `ui/`·`miso-sdk/` 수정 금지.
- 색·라운딩은 `meeting.css` 의 시맨틱 토큰 값(라이트/다크 쌍)으로만 조정 — 컴포넌트에 hex 하드코딩 금지 (화자 팔레트·스테이지 색은 `--mn-*` 토큰).
- `React.StrictMode` 추가 금지 (PocketBase auto-cancel 충돌).
- 데이터와 뷰 분리: 브랜딩·프리셋·모델 ID 는 `meeting-config.ts` 에만.

---

_검증: 실제 코더 템플릿에 오버레이 후 `tsc -b` + `vite build` 통과. 로컬 PB(0.31.0, batch enabled)+mock LLM 환경에서 E2E 검증 — 2화자 53초 한국어 합성 오디오 업로드 → WASM 전사(폴백 체인) → **화자 분리 S3/S4 정확 분리** → batch 세그먼트 저장 → 회의록 생성(TOC·인용 칩) → 인용 칩 클릭 시크+오디오 스트리밍 재생+자동 팔로우 → 화자 rename 일괄 반영 → AI 채팅 인용 → 첨부(md) 추출 → 공유 뷰(회의록 전용) → 본문 검색 → 다크모드까지 스크린샷 확인. 라이브 녹음 UI 는 마이크 에러 경로까지 확인(실 마이크 흐름은 업로드와 동일 파이프라인 공유)._
