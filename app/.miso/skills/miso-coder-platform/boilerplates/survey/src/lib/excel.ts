// CSV export 유틸리티. 기본 코더 템플릿의 브라우저 API만 사용한다.

/**
 * 행 배열을 CSV 파일로 내보내 즉시 다운로드한다.
 * @param rows      내보낼 데이터 행 배열 (각 행은 키-값 객체)
 * @param filename  저장될 파일명 (.csv 확장자 자동 추가)
 */
export function exportToCsv(
  rows: Record<string, unknown>[],
  filename: string,
): void {
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
  ]
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value)
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}
