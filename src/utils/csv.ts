function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV matnini yaratadi (Excel uchun `;` ajratgich va UTF-8 BOM bilan). */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'))
  return `﻿${lines.join('\r\n')}`
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
