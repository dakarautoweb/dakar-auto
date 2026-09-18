// Pure, format-only serializers for AdminDataTable's export/share menu.
// Deliberately dependency-free: the one library that would make "real"
// Excel export easier (npm's `xlsx` / SheetJS) currently ships with an
// unpatched high-severity advisory (GHSA-4r6h-8v6p-xvw6, prototype
// pollution — see `npm audit`), so Excel export below uses the standard
// "HTML table saved as .xls" technique instead: Excel opens it natively
// (it may show a one-time "format differs from the extension" prompt,
// which is the accepted trade-off for not shipping a vulnerable
// dependency for a write-only, self-generated file).
export type ExportTable = { header: string[]; rows: string[][] }

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(table: ExportTable): string {
  const lines = [table.header, ...table.rows].map((row) => row.map(csvEscape).join(','))
  return lines.join('\n')
}

// Plain-text TSV — pastes as real columns into Sheets/Excel/Notion, unlike
// comma-joined text.
export function toTsv(table: ExportTable): string {
  const clean = (value: string) => value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
  return [table.header, ...table.rows].map((row) => row.map(clean).join('\t')).join('\n')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function toHtmlTableBody(table: ExportTable): string {
  const head = `<tr>${table.header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`
  const body = table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
  return `<table>${head}${body}</table>`
}

export function toExcelHtml(table: ExportTable, sheetTitle: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]><xml>
<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${escapeHtml(sheetTitle).slice(0, 31)}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
<style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:12px;}th,td{border:1px solid #d0d7de;padding:4px 8px;}th{background:#f2f2f2;font-weight:bold;}</style>
</head>
<body>${toHtmlTableBody(table)}</body>
</html>`
}

// Shared by Print, "Export as PDF" (the browser's own print dialog lets the
// user pick "Save as PDF" as the destination — there is no dependency-free
// way to produce a PDF file directly from the browser, and adding a PDF
// library just to skip that one extra click would be exactly the "heavy
// dependency for no reason" the brief warns against) and "Download report"
// (the same document saved as a standalone .html file instead of opened).
// A bare, self-contained document — no sidebar/header/app chrome exists in
// it at all, so there's nothing to hide.
export function buildPrintableReportHtml(opts: {
  title: string
  generatedAtLabel: string
  generatedAt: string
  filtersLabel: string
  filtersSummary?: string
  table: ExportTable
}): string {
  const filtersRow = opts.filtersSummary
    ? `<div class="meta">${escapeHtml(opts.filtersLabel)}: ${escapeHtml(opts.filtersSummary)}</div>`
    : ''
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)} — Dakar Auto</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; margin: 0; }
  .brand { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #f97316; margin-bottom: 6px; }
  h1 { font-size: 21px; margin: 0 0 6px; }
  .meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 12px; }
  th, td { border: 1px solid #e5e7eb; padding: 7px 10px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #374151; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  @media print {
    body { padding: 0; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
  <div class="brand">Dakar Auto</div>
  <h1>${escapeHtml(opts.title)}</h1>
  <div class="meta">${escapeHtml(opts.generatedAtLabel)}: ${escapeHtml(opts.generatedAt)}</div>
  ${filtersRow}
  ${toHtmlTableBody(opts.table)}
</body>
</html>`
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Opens a fresh, blank tab synchronously (before the async work below) so
// Safari/browsers don't treat the later `window.open` as an unsolicited
// popup — callers pass an already-open `window` reference, then this fills
// it in and triggers print once the document has actually painted.
export function writeAndPrint(target: Window, html: string) {
  target.document.open()
  target.document.write(html)
  target.document.close()
  target.focus()
  // The new document's own onload (images/fonts) must fire before print()
  // measures layout — a fixed delay would either flash unstyled content or
  // race a slow load, so this waits for the real load event instead.
  target.onload = () => {
    target.print()
  }
}
