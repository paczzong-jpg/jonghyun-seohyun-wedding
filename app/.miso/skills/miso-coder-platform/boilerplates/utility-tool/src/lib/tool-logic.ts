/**
 * ★ 교체 지점 — 이 파일의 transform() 구현만 바꾸면 도구 전체가 바뀐다.
 *
 * 현재 예시: 케이스 변환 + JSON 정렬 + 슬러그화 (3가지 실제 동작 변환)
 */

export type TransformMode = "case-upper" | "case-lower" | "case-title" | "json-sort" | "slug"

export interface ToolOptions {
  mode: TransformMode
}

/**
 * 입력 문자열을 주어진 옵션에 따라 변환한다.
 * 실패 시 Error를 throw — 호출자(ToolPage)에서 catch해 에러 메시지로 표시한다.
 */
export function transform(input: string, opts: ToolOptions): string {
  const text = input.trim()
  if (!text) return ""

  switch (opts.mode) {
    case "case-upper":
      return text.toUpperCase()

    case "case-lower":
      return text.toLowerCase()

    case "case-title":
      return text
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase())

    case "json-sort": {
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error("유효한 JSON이 아닙니다. 입력값을 확인하세요.")
      }
      return JSON.stringify(sortObjectKeys(parsed), null, 2)
    }

    case "slug":
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // 발음 부호 제거
        .replace(/[^a-z0-9\s-]/g, "")    // 특수문자 제거
        .trim()
        .replace(/\s+/g, "-")            // 공백 → 하이픈
        .replace(/-+/g, "-")             // 연속 하이픈 정리

    default:
      throw new Error(`알 수 없는 변환 모드: ${opts.mode satisfies never}`)
  }
}

/** JSON 객체의 키를 재귀적으로 알파벳 순 정렬 */
function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys)
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortObjectKeys((value as Record<string, unknown>)[k])])
    )
  }
  return value
}

/** UI 표시용 모드 레이블 */
export const TRANSFORM_MODES: { value: TransformMode; label: string }[] = [
  { value: "case-upper", label: "대문자 변환 (UPPER CASE)" },
  { value: "case-lower", label: "소문자 변환 (lower case)" },
  { value: "case-title", label: "타이틀 케이스 (Title Case)" },
  { value: "json-sort",  label: "JSON 키 정렬 (Sort Keys)" },
  { value: "slug",       label: "URL 슬러그화 (slug-ify)" },
]
