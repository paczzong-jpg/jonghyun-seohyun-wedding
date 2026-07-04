export function exportToCsv(fileName: string, rows: Record<string, string | number | null | undefined>[]) {
  if (rows.length === 0) return
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function importFromCsv(file: File): Promise<Record<string, string>[]> {
  const text = await file.text()
  const rows = parseCsv(text.trim())
  if (rows.length === 0) return []
  const [headers, ...body] = rows
  return body
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
}

function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  rows.push(row)
  return rows
}
