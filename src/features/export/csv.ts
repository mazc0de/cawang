/** One CSV field: quoted when it holds a comma, quote or line break (RFC 4180). */
function field(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/** CSV text with a UTF-8 byte-order mark so Excel reads accents and "→" correctly. */
export function toCsv(header: string[], rows: Array<Array<string | number>>): string {
  return '﻿' + [header, ...rows].map((row) => row.map(field).join(',')).join('\r\n') + '\r\n'
}

export function downloadText(filename: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
