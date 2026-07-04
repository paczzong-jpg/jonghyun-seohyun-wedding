# utility-tool (boilerplate)

단일 페이지 변환/생성 도구 시작점. **코더 템플릿(Vite + React + react-router-dom + MISO SDK) 위에 얹는 오버레이**다.
"입력 → 변환 → 출력(복사/다운로드)" 골격만 담았다. 변환 로직(`src/lib/tool-logic.ts`)만 교체해 임의의 단일 페이지 도구를 만든다.

> 이 폴더는 **베이스 코더 템플릿을 전제**한다. `src/components/ui/`(shadcn 45종), `src/lib/utils.ts`, 설정파일은 템플릿에 이미 있으므로 여기 중복 포함하지 않는다. 아래 파일을 템플릿의 같은 경로에 덮어/추가하면 된다.

## 들어있는 것 (덮어쓸 위치 = 템플릿 동일 경로)

```
src/App.tsx                              라우터(BrowserRouter+Routes) — 템플릿 스타터 App 대체
src/pages/ToolPage.tsx                   도구 페이지 (좌:입력 패널 / 우:출력 패널)
src/components/tool/
  tool-header.tsx                        제목·설명 헤더
  input-panel.tsx                        Textarea + 변환 옵션 셀렉트 + 실행 버튼
  output-panel.tsx                       결과 표시 + 복사·다운로드 버튼
src/lib/tool-logic.ts                    transform() 구현 + ToolOptions 타입 (★ 교체 지점)
```

## 사용법 (코더용)

1. 위 파일들을 템플릿 같은 경로에 배치 (`src/App.tsx`는 교체).
2. 플랫폼 preview/dev server를 사용한다. dev 서버는 플랫폼 관리이므로 재시작하지 않는다.
3. **변환 로직 교체**: `src/lib/tool-logic.ts`의 `transform()` 함수와 `TransformMode` 타입, `TRANSFORM_MODES` 배열만 수정.

   ```ts
   // 예: 마크다운 → HTML 변환 도구
   export type TransformMode = "md-to-html" | "html-to-md"

   export function transform(input: string, opts: ToolOptions): string {
     if (opts.mode === "md-to-html") {
       // 변환 구현...
     }
     // ...
   }
   ```

4. **제목/설명 변경**: `src/pages/ToolPage.tsx`에서 `<ToolHeader>` props 수정.
5. **출력 파일명 변경**: `ToolPage.tsx`의 `filename` prop 수정.
6. 입력 UI 확장 필요 시 `input-panel.tsx`에 필드 추가, 타입은 `ToolOptions`에 반영.

## 포함된 변환 예시 (tool-logic.ts)

| 모드 | 동작 |
|------|------|
| `case-upper` | 전체 대문자 변환 |
| `case-lower` | 전체 소문자 변환 |
| `case-title` | 단어 첫 글자 대문자 (Title Case) |
| `json-sort` | JSON 키 알파벳 순 정렬 (재귀) |
| `slug` | URL 슬러그화 (공백→하이픈, 특수문자 제거) |

## 규칙 (템플릿 규칙 준수)

- shadcn은 `@/components/ui/*`에서 **직접 import** (CLI 설치 금지, ui/ 수정 금지).
- `cn()`은 `@/lib/utils`.
- **시맨틱 토큰만**: `bg-background text-foreground bg-card text-muted-foreground border-border text-primary`. 하드코딩 색상 지양.
- **변환 로직과 UI 분리**: 로직은 `src/lib/tool-logic.ts`에만.
- **한 컴포넌트 = 한 책임**: 입력/출력/헤더 컴포넌트를 한 파일에 합치지 말 것.
- `React.StrictMode` 추가 금지 (PocketBase auto-cancel 충돌).
- named export 사용 (`App` 제외 — App은 default export).

---
_검증: 실제 코더 템플릿에 오버레이 후 `npm run build`(tsc -b + vite build) 통과._
