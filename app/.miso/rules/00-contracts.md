# 문서 읽기 순서 및 SSoT 계층

이 문서는 MISO 앱 연동 코드를 생성할 때 **어떤 문서를 어떤 순서로 읽어야 하는지** 규정한다.
충돌 발생 시 상위 순위가 하위 순위를 덮어쓴다.

---

## SSoT 계층 (MUST)

| 순위 | 위치 | 내용 | 잠금 |
|------|------|------|------|
| 1 | `src/lib/miso-sdk/` | 훅 시그니처·타입의 진실 원천 | DO NOT MODIFY |
| 2 | `.miso/specs/api-integration/app-*.md`<br>`.miso/specs/api-integration/model-*.md`<br>`.miso/specs/api-integration/tool-*.md`<br>`.miso/specs/api-integration/knowledge-*.md` | 앱/모델/도구/지식별 ID, 파라미터, Usage 예제 | DO NOT MODIFY |
| 3 | `.miso/skills/miso-coder-platform/SKILL.md`<br>`.miso/skills/miso-coder-platform/references/miso/*.md` | 백엔드 공통 계약 (FileTransferMethod 허용 값, `inputs` vs `files` 구분, knowledge datasetId 전달 방식 등) | DO NOT MODIFY |
| 4 | `INSTRUCTIONS.md` | 샌드박스 인프라 규칙 (PocketBase, StrictMode, 환경변수 등) | DO NOT MODIFY |

---

## 읽기 순서 (MUST)

아래 순서를 작업 유형에 맞게 따른다.

### 1. 앱 연동 작업 시작
`.miso/specs/api-integration/app-{name}.md` 를 먼저 읽는다.
확인 항목:
- App ID
- Input Parameters 테이블 (변수명, 타입, 필수 여부)
- Usage 예제

### 2. Input Parameters에 `file` 타입 변수가 있는 경우
`.miso/skills/miso-coder-platform/references/miso/chatflow.md` 또는 해당 앱 타입의
`references/miso/{agent,workflow}.md` 파일 처리 섹션을 읽는다.
확인 항목:
- `transfer_method` 허용 값 (`remote_url` / `local_file`)
- `/__api/files/upload` 업로드 절차
- `inputs` 객체에 파일 객체를 전달하는 형식

### 3. 훅 시그니처·반환값이 불확실한 경우
`src/lib/miso-sdk/miso-hooks.ts` 의 export를 직접 확인한다.
skill 문서의 예제는 참고용일 뿐이며, 실제 타입은 소스 파일이 기준이다.

### 4. 공통 에러 패턴 확인
`.miso/skills/miso-coder-platform/references/miso/{chatflow,agent,workflow}.md` 의
Verification/Common Wrong Paths 섹션을 읽는다.

---

## 충돌 해결 규칙

```
src/lib/miso-sdk/ (1순위)
  > app-*.md spec 파일 (2순위)
    > .miso/skills/*.md 공통 계약 (3순위)
      > INSTRUCTIONS.md (4순위)
```

skill 문서의 예제 코드와 `miso-sdk` 소스의 실제 시그니처가 다를 경우,
**반드시 `miso-sdk` 소스를 따른다**.

---

## 금지 사항

- **훅 시그니처를 skill 문서에서 추론하지 말 것.** 반드시 `src/lib/miso-sdk/miso-hooks.ts` 소스를 직접 확인한다.
- **`transfer_method` 값을 추측하지 말 것.** 허용 값은 `remote_url` 과 `local_file` 두 가지뿐이다.
- **`inputs` 구조를 추측하지 말 것.** 반드시 해당 앱의 `.miso/specs/api-integration/app-{name}.md` 를 먼저 확인한다.
- **존재하지 않는 훅 이름을 사용하지 말 것.** `miso-sdk` export 목록에 없는 훅은 존재하지 않는다.
- **`files`와 `inputs` 를 혼동하지 말 것.** `inputs` 는 앱의 입력 폼 변수이고, `files` 는 채팅 메시지 첨부 파일이다. 개념이 완전히 다르다.

---

## 빠른 참조: 파일 타입별 전달 형식

| 상황 | `transfer_method` | 전달 형식 |
|------|-------------------|-----------|
| 외부 HTTP/HTTPS URL | `remote_url` | `{ type, transfer_method, url }` |
| 브라우저에서 선택한 파일 | `local_file` | `{ type, transfer_method, upload_file_id }` |

`upload_file_id` 는 `/__api/files/upload` 응답의 `id` 필드다.
`base64 data URL` 을 `remote_url` 로 전달하는 것은 불가하다 (백엔드가 HEAD 요청을 보냄).
