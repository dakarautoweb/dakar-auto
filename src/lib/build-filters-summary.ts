// Joins whichever (label, value) pairs actually have a value into one
// "Label: value · Label: value" line for the Print/PDF/Download-report
// document's "Active filters" row — used by the admin list pages, which
// already know their own current filter state server-side. Returns
// undefined (not an empty string) when nothing is active, so callers can
// omit the whole "Active filters" line instead of printing an empty one.
export function buildFiltersSummary(parts: Array<[label: string, value: string | null | undefined]>): string | undefined {
  const shown = parts.filter((part): part is [string, string] => Boolean(part[1]))
  if (shown.length === 0) return undefined
  return shown.map(([label, value]) => `${label}: ${value}`).join(' · ')
}
