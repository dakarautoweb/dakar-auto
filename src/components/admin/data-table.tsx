'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type ComponentType, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, GripVertical } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buildPrintableReportHtml, downloadTextFile, toCsv, toExcelHtml, toTsv, writeAndPrint, type ExportTable } from '@/src/lib/table-export'
import { ExportShareMenu } from './export-share-menu'
import { SendReportModal } from './send-report-modal'
import { BulkActionsMenu } from './bulk-actions-menu'
import { BulkStatusModal } from './bulk-status-modal'
import { BulkDeleteModal } from './bulk-delete-modal'

// Config a table wrapper (requests-table.tsx / vehicle-requests-table.tsx)
// hands to AdminDataTable to turn on the "Actions" bulk-selection menu.
// Omitted entirely (as clients-table.tsx does) and the menu just doesn't
// render — the plain "X selected / Clear" chip behaves exactly as before.
// updateStatus/deleteRows/archiveRows/restoreRows call straight into this
// table's own existing server actions — AdminDataTable never talks to
// Supabase directly.
export type BulkActionsConfig = {
  statuses: readonly string[]
  statusLabels: Record<string, string>
  statusIcons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>>
  statusChipClasses: Record<string, string>
  newStatusLabel: string
  updateStatus: (ids: string[], status: string) => Promise<{ ok: boolean; failedCount: number }>
  deleteRows: (ids: string[]) => Promise<{ ok: boolean; error?: string }>
  // Whichever of the Active/Archived/All picker is currently selected (see
  // requests-filters.tsx / vehicle-requests-filters.tsx) — decides whether
  // the menu offers "Archive selected" (active/all) or "Restore selected"
  // (archived), so a view that's already showing archived rows never offers
  // to archive them again.
  view: 'active' | 'archived' | 'all'
  archiveRows: (ids: string[]) => Promise<{ ok: boolean; error?: string }>
  restoreRows: (ids: string[]) => Promise<{ ok: boolean; error?: string }>
}

// Generic "Excel-like" admin table: client-side column resize / reorder /
// show-hide / sort / pagination + CSV export, layered on top of rows that
// are already fetched and filtered server-side (search / status / date —
// see requests-filters.tsx and vehicle-requests-filters.tsx). Deliberately
// NOT inline-edit — every cell is `render`-only, per the brief.
//
// Shared by the parts-requests table, the vehicle-requests table and the
// clients table (see requests-table.tsx / vehicle-requests-table.tsx /
// app/admin/(dashboard)/clients/page.tsx) so resize/reorder/visibility/
// pagination behave identically everywhere instead of three hand-rolled
// tables drifting apart.
export type AdminColumn<T> = {
  id: string
  label: string
  defaultWidth: number
  minWidth?: number
  sortable?: boolean
  sortValue?: (row: T) => string | number
  csvValue?: (row: T) => string
  render: (row: T) => ReactNode
  // Action/checkbox-style columns that don't make sense to hide.
  alwaysVisible?: boolean
  // Header + cell text alignment — defaults to 'left'. Clients uses
  // 'center' on every column per the design brief; requests/vehicle
  // tables keep the default left alignment (better for scanning names/
  // dates/long text).
  align?: 'left' | 'center' | 'right'
}

const ALIGN_CLASSES: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}
const ALIGN_JUSTIFY_CLASSES: Record<'left' | 'center' | 'right', string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

type SortState = { id: string; dir: 'asc' | 'desc' } | null

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode, quota) — resize/reorder/
    // visibility still work for the session, they just won't persist.
  }
}

// Row identity is a plain serializable field (`__rowId`), not a callback —
// AdminDataTable is a Client Component, and the tables that feed it
// (requests-table.tsx / vehicle-requests-table.tsx / clients-table.tsx) are
// Client Components too, but the *pages* that fetch `rows` are Server
// Components. A `getRowId(row) => string` callback prop would have to
// survive a Server → Client boundary somewhere in that chain, and React
// Server Components can't serialize functions across it. Every row is
// stamped with `__rowId` (from each dataset's own real stable id — see the
// callers) before it ever reaches this component, so no function crosses
// any boundary for identity purposes.
export function AdminDataTable<T extends { __rowId: string }>({
  dict,
  locale,
  storageKey,
  columns,
  rows,
  emptyMessage,
  exportFileName,
  reportTitle,
  filtersSummary,
  bulkActions,
}: {
  dict: Dictionary
  // Only used to format the "Generated at" date on the Print/PDF/Download
  // report document — every other date in this table is already formatted
  // by the caller's own column render()/csvValue.
  locale: string
  // Namespaces this table's localStorage keys (widths/order/hidden/page
  // size) — must be unique per table (e.g. "admin-requests-table").
  storageKey: string
  columns: AdminColumn<T>[]
  rows: T[]
  emptyMessage: string
  exportFileName: string
  // Heading printed on the Print/PDF/Download-report document — falls back
  // to exportFileName when the caller doesn't have a nicer label handy.
  reportTitle?: string
  // Human-readable active-filters line for that same document (e.g.
  // "Status: On treatment · Search: \"dupont\"") — omitted entirely when
  // there's nothing to show, rather than an empty "Filters:" line.
  filtersSummary?: string
  // Turns on the "Actions" bulk-selection menu (change status / export
  // selected / archive / delete permanently) next to "X selected". Omitted
  // by clients-table.tsx, which has no use for it.
  bulkActions?: BulkActionsConfig
}) {
  const router = useRouter()
  const t = dict.admin.tableControls
  const bulkT = dict.admin.bulkActions
  const defaultOrder = useMemo(() => columns.map((c) => c.id), [columns])

  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.id, c.defaultWidth]))
  )
  const [order, setOrder] = useState<string[]>(defaultOrder)
  const [hidden, setHidden] = useState<string[]>([])
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false)
  const columnsMenuRef = useRef<HTMLDivElement>(null)
  // Row selection — keyed by __rowId, entirely separate from
  // widths/order/hidden/pageSize above (never persisted, never touches the
  // column-layout mechanism), so it can't interfere with resize/reorder/
  // visibility. A stale id (e.g. left over after `rows` changes under a new
  // filter) simply matches nothing in `selectedRows` below — harmless.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)

  // Bulk-actions ("Actions" menu next to "X selected") — entirely separate
  // from the export/share state above, only ever active when the caller
  // passed a BulkActionsConfig (see requests-table.tsx / vehicle-requests-
  // table.tsx).
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null)
  const [bulkPending, startBulkTransition] = useTransition()

  // Hydrate persisted layout after mount only (localStorage doesn't exist
  // during SSR) — the first client render matches the server render
  // exactly, then this effect applies the user's saved layout. This is a
  // one-time sync with an external system (browser storage), the exact
  // case React's own docs carve out as a legitimate use of an Effect —
  // hence the targeted disable rather than restructuring it away.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWidths((w) => ({ ...w, ...readJSON(`${storageKey}:widths`, {}) }))
    const savedOrder = readJSON<string[]>(`${storageKey}:order`, [])
    if (savedOrder.length > 0) {
      const known = savedOrder.filter((id) => defaultOrder.includes(id))
      const missing = defaultOrder.filter((id) => !known.includes(id))
      setOrder([...known, ...missing])
    }
    setHidden(readJSON<string[]>(`${storageKey}:hidden`, []))
    setPageSize(readJSON<number>(`${storageKey}:pageSize`, 25))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time hydration on mount
  }, [])

  useEffect(() => {
    if (!columnsMenuOpen) return
    function onClick(e: MouseEvent) {
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) setColumnsMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [columnsMenuOpen])

  // No effect-based "reset to page 1 on filter/sort change" here — `safePage`
  // below already clamps to a valid page whenever `rows`/`pageSize` shrink
  // the page count, which is all correctness requires; an Effect just to
  // force page 1 on every rows/sort/pageSize change would be exactly the
  // "unnecessary Effect for derived state" React's docs warn against.

  function persistWidths(next: Record<string, number>) {
    setWidths(next)
    writeJSON(`${storageKey}:widths`, next)
  }
  function persistOrder(next: string[]) {
    setOrder(next)
    writeJSON(`${storageKey}:order`, next)
  }
  function persistHidden(next: string[]) {
    setHidden(next)
    writeJSON(`${storageKey}:hidden`, next)
  }
  function persistPageSize(next: number) {
    setPageSize(next)
    writeJSON(`${storageKey}:pageSize`, next)
  }

  const columnsById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns])
  const visibleColumns = useMemo(
    () => order.map((id) => columnsById.get(id)).filter((c): c is AdminColumn<T> => c !== undefined && !hidden.includes(c.id)),
    [order, hidden, columnsById]
  )

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columnsById.get(sort.id)
    if (!column?.sortValue) return rows
    const withValue = rows.map((row) => ({ row, value: column.sortValue!(row) }))
    withValue.sort((a, b) => {
      if (typeof a.value === 'number' && typeof b.value === 'number') return a.value - b.value
      return String(a.value).localeCompare(String(b.value))
    })
    if (sort.dir === 'desc') withValue.reverse()
    return withValue.map((w) => w.row)
  }, [rows, sort, columnsById])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pagedRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const dragIdRef = useRef<string | null>(null)

  function toggleSort(columnId: string) {
    setSort((current) => {
      if (!current || current.id !== columnId) return { id: columnId, dir: 'asc' }
      if (current.dir === 'asc') return { id: columnId, dir: 'desc' }
      return null
    })
  }

  function startResize(columnId: string, minWidth: number, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = widths[columnId] ?? minWidth
    function onMove(ev: MouseEvent) {
      const next = Math.max(minWidth, Math.round(startWidth + (ev.clientX - startX)))
      setWidths((w) => ({ ...w, [columnId]: next }))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setWidths((w) => {
        writeJSON(`${storageKey}:widths`, w)
        return w
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function handleDrop(targetId: string) {
    const draggedId = dragIdRef.current
    dragIdRef.current = null
    if (!draggedId || draggedId === targetId) return
    // Reorders the full `order` array (hidden columns included, so a
    // column's position is preserved even while it's hidden) by moving
    // draggedId to targetId's position.
    const without = order.filter((id) => id !== draggedId)
    const targetIndex = without.indexOf(targetId)
    without.splice(targetIndex, 0, draggedId)
    persistOrder(without)
  }

  // Row selection is keyed by __rowId and only ever toggled from the
  // fixed checkbox column below — the header checkbox selects/clears every
  // row on the *current page* (not every filtered row across all pages,
  // which would be a surprising bulk-select nobody asked for).
  const pageRowIds = useMemo(() => pagedRows.map((r) => r.__rowId), [pagedRows])
  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selected.has(id))
  const somePageSelected = pageRowIds.some((id) => selected.has(id))
  const selectedRows = useMemo(() => sortedRows.filter((row) => selected.has(row.__rowId)), [sortedRows, selected])

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePageSelection() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        for (const id of pageRowIds) next.delete(id)
      } else {
        for (const id of pageRowIds) next.add(id)
      }
      return next
    })
  }

  // Builds the header+rows shape every export/share format serializes from
  // — same csvValue/sortValue fallback CSV export always used, so every
  // format (CSV, Excel, copy, print/PDF, email) reads identical text for a
  // given cell, never re-derived per format.
  function buildExportTable(source: T[]): ExportTable {
    return {
      header: visibleColumns.map((c) => c.label),
      rows: source.map((row) => visibleColumns.map((c) => (c.csvValue ? c.csvValue(row) : c.sortValue ? String(c.sortValue(row)) : ''))),
    }
  }

  const title = reportTitle ?? exportFileName
  const generatedAt = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())

  function reportHtml() {
    return buildPrintableReportHtml({
      title,
      generatedAtLabel: t.generatedAt,
      generatedAt,
      filtersLabel: t.activeFilters,
      filtersSummary,
      table: buildExportTable(sortedRows),
    })
  }

  function handleExportCsv() {
    downloadTextFile(`﻿${toCsv(buildExportTable(sortedRows))}`, `${exportFileName}.csv`, 'text/csv')
  }

  function handleExportExcel() {
    downloadTextFile(toExcelHtml(buildExportTable(sortedRows), title), `${exportFileName}.xls`, 'application/vnd.ms-excel')
  }

  async function handleCopyTable() {
    try {
      await navigator.clipboard.writeText(toTsv(buildExportTable(sortedRows)))
      setShareFeedback(t.copied)
    } catch {
      setShareFeedback(t.copyFailed)
    }
    window.setTimeout(() => setShareFeedback(null), 2500)
  }

  function handlePrintOrPdf() {
    const win = window.open('', '_blank')
    if (!win) return
    writeAndPrint(win, reportHtml())
  }

  function handleDownloadReport() {
    downloadTextFile(reportHtml(), `${exportFileName}.html`, 'text/html')
  }

  async function handleShareSelected() {
    const text = toTsv(buildExportTable(selectedRows))
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text })
        return
      } catch {
        // User cancelled the native share sheet, or the platform rejected
        // it (e.g. text too long) — clipboard fallback below still gives
        // them something useful instead of silently doing nothing.
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setShareFeedback(t.selectedCopied)
    } catch {
      setShareFeedback(t.copyFailed)
    }
    window.setTimeout(() => setShareFeedback(null), 2500)
  }

  // "Export selected" bulk action — reuses buildExportTable/toCsv/
  // downloadTextFile exactly as the full-table CSV export above does, just
  // scoped to selectedRows instead of sortedRows. No parallel export system.
  function handleBulkExportSelected() {
    downloadTextFile(`﻿${toCsv(buildExportTable(selectedRows))}`, `${exportFileName}-selection.csv`, 'text/csv')
  }

  function showBulkFeedback(message: string) {
    setBulkFeedback(message)
    window.setTimeout(() => setBulkFeedback(null), 3000)
  }

  function handleBulkChangeStatus(newStatus: string) {
    if (!bulkActions) return
    setBulkError(null)
    const ids = Array.from(selected)
    startBulkTransition(async () => {
      const result = await bulkActions.updateStatus(ids, newStatus)
      if (!result.ok) {
        setBulkError(bulkT.error)
        return
      }
      setBulkStatusModalOpen(false)
      setSelected(new Set())
      showBulkFeedback(bulkT.successStatusUpdated.replace('{count}', String(ids.length)))
      router.refresh()
    })
  }

  function handleBulkDelete() {
    if (!bulkActions) return
    setBulkError(null)
    const ids = Array.from(selected)
    startBulkTransition(async () => {
      const result = await bulkActions.deleteRows(ids)
      if (!result.ok) {
        setBulkError(bulkT.error)
        return
      }
      setBulkDeleteModalOpen(false)
      setSelected(new Set())
      showBulkFeedback(bulkT.successDeleted.replace('{count}', String(ids.length)))
      router.refresh()
    })
  }

  // Archive when the current view is 'active'/'all', restore when it's
  // 'archived' — see BulkActionsConfig.view's comment.
  function handleBulkArchiveOrRestore() {
    if (!bulkActions) return
    setBulkError(null)
    const ids = Array.from(selected)
    const restoring = bulkActions.view === 'archived'
    startBulkTransition(async () => {
      const result = restoring ? await bulkActions.restoreRows(ids) : await bulkActions.archiveRows(ids)
      if (!result.ok) {
        setBulkError(bulkT.error)
        return
      }
      setSelected(new Set())
      showBulkFeedback((restoring ? bulkT.successRestored : bulkT.successArchived).replace('{count}', String(ids.length)))
      router.refresh()
    })
  }

  // The selection checkbox column is fixed-width and lives entirely outside
  // widths/order/hidden — it's prepended to every row regardless of column
  // layout, so resize/reorder/visibility (and their persisted state) never
  // have to know it exists.
  const SELECT_COL_WIDTH = 44
  const totalWidth = SELECT_COL_WIDTH + visibleColumns.reduce((sum, c) => sum + (widths[c.id] ?? c.defaultWidth), 0)

  return (
    <div>
      {/* Toolbar: column visibility + export + rows-per-page live here;
          search / quick status filters / date range are rendered by the
          page above this table (they navigate via URL params, server-side —
          see requests-filters.tsx) since they change which rows are fetched,
          not how the already-fetched rows are displayed. */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
        <div className="relative" ref={columnsMenuRef}>
          <button
            type="button"
            onClick={() => setColumnsMenuOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition duration-200 hover:border-accent-hover/50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
            {t.columns}
          </button>
          {columnsMenuOpen && (
            <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-xl border border-border bg-card p-2 shadow-card-hover">
              {columns.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                    c.alwaysVisible ? 'text-muted-foreground/60' : 'text-foreground hover:bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={c.alwaysVisible}
                    checked={!hidden.includes(c.id)}
                    onChange={(e) => {
                      const next = e.target.checked ? hidden.filter((id) => id !== c.id) : [...hidden, c.id]
                      persistHidden(next)
                    }}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  {c.label}
                </label>
              ))}
              <button
                type="button"
                onClick={() => {
                  persistHidden([])
                  persistOrder(defaultOrder)
                  persistWidths(Object.fromEntries(columns.map((c) => [c.id, c.defaultWidth])))
                }}
                className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-accent hover:bg-accent-soft"
              >
                {t.resetColumns}
              </button>
            </div>
          )}
        </div>
        {selected.size > 0 && (
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 text-xs font-medium text-accent">
            {t.selectedCount.replace('{count}', String(selected.size))}
            <button type="button" onClick={() => setSelected(new Set())} className="font-semibold underline-offset-2 hover:underline">
              {t.clearSelection}
            </button>
          </span>
        )}
        {bulkActions && selected.size > 0 && (
          <BulkActionsMenu
            dict={dict}
            onChangeStatus={() => {
              setBulkError(null)
              setBulkStatusModalOpen(true)
            }}
            onExportSelected={handleBulkExportSelected}
            archiveMode={bulkActions.view === 'archived' ? 'restore' : 'archive'}
            onArchiveOrRestoreSelected={handleBulkArchiveOrRestore}
            onDeletePermanently={() => {
              setBulkError(null)
              setBulkDeleteModalOpen(true)
            }}
          />
        )}
        {bulkFeedback && <span className="text-xs font-medium text-accent">{bulkFeedback}</span>}
        {shareFeedback && <span className="text-xs font-medium text-accent">{shareFeedback}</span>}
        <ExportShareMenu
          dict={dict}
          hasSelection={selected.size > 0}
          onPrint={handlePrintOrPdf}
          onPdf={handlePrintOrPdf}
          onExcel={handleExportExcel}
          onCsv={handleExportCsv}
          onCopyTable={handleCopyTable}
          onEmail={() => setEmailModalOpen(true)}
          onShareSelected={handleShareSelected}
          onDownloadReport={handleDownloadReport}
        />
      </div>

      {emailModalOpen && (
        <SendReportModal
          dict={dict}
          title={title}
          hasSelection={selected.size > 0}
          selectedCount={selected.size}
          buildCsv={(scope) => `﻿${toCsv(buildExportTable(scope === 'selected' ? selectedRows : sortedRows))}`}
          exportFileName={exportFileName}
          onClose={() => setEmailModalOpen(false)}
        />
      )}

      {bulkActions && bulkStatusModalOpen && (
        <BulkStatusModal
          dict={dict}
          count={selected.size}
          statuses={bulkActions.statuses}
          labels={bulkActions.statusLabels}
          icons={bulkActions.statusIcons}
          chipClasses={bulkActions.statusChipClasses}
          newStatusLabel={bulkActions.newStatusLabel}
          initialStatus={bulkActions.statuses[0]}
          pending={bulkPending}
          error={bulkError}
          onConfirm={handleBulkChangeStatus}
          onCancel={() => {
            setBulkStatusModalOpen(false)
            setBulkError(null)
          }}
        />
      )}

      {bulkActions && bulkDeleteModalOpen && (
        <BulkDeleteModal
          dict={dict}
          count={selected.size}
          pending={bulkPending}
          error={bulkError}
          onConfirm={handleBulkDelete}
          onCancel={() => {
            setBulkDeleteModalOpen(false)
            setBulkError(null)
          }}
        />
      )}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="overflow-x-auto">
              <div className="max-h-[65vh] overflow-y-auto">
                <table
                  className="text-left text-sm [&_td:nth-child(even)]:bg-foreground/[0.025] [&_th:nth-child(even)]:bg-foreground/[0.025]"
                  style={{ tableLayout: 'fixed', width: totalWidth, minWidth: '100%' }}
                >
                  <colgroup>
                    <col style={{ width: SELECT_COL_WIDTH }} />
                    {visibleColumns.map((c) => (
                      <col key={c.id} style={{ width: widths[c.id] ?? c.defaultWidth }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-surface text-xs font-semibold tracking-wide text-muted-foreground uppercase shadow-[0_1px_0_0_var(--border)]">
                    <tr className="divide-x divide-border/60">
                      <th className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = !allPageSelected && somePageSelected
                          }}
                          onChange={togglePageSelection}
                          aria-label={t.selectAllOnPage}
                          className="h-3.5 w-3.5 accent-accent"
                        />
                      </th>
                      {visibleColumns.map((c) => {
                        const align = c.align ?? 'left'
                        return (
                          <th
                            key={c.id}
                            draggable
                            onDragStart={() => {
                              dragIdRef.current = c.id
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(c.id)}
                            className={`relative px-4 py-3 select-none ${ALIGN_CLASSES[align]}`}
                          >
                            <span className={`flex items-center gap-1.5 ${ALIGN_JUSTIFY_CLASSES[align]}`}>
                              {align !== 'center' && (
                                <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-muted-foreground/40" strokeWidth={2} />
                              )}
                              {c.sortable ? (
                                <button
                                  type="button"
                                  onClick={() => toggleSort(c.id)}
                                  className="flex items-center gap-1 truncate hover:text-foreground"
                                >
                                  <span className="truncate">{c.label}</span>
                                  {sort?.id === c.id ? (
                                    sort.dir === 'asc' ? (
                                      <ArrowUp className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                                    ) : (
                                      <ArrowDown className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                                    )
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 shrink-0 opacity-30" strokeWidth={2} />
                                  )}
                                </button>
                              ) : (
                                <span className="truncate">{c.label}</span>
                              )}
                              {align === 'center' && (
                                <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-muted-foreground/40" strokeWidth={2} />
                              )}
                            </span>
                            <span
                              onMouseDown={(e) => startResize(c.id, c.minWidth ?? 60, e)}
                              className="absolute inset-y-0 right-0 w-2 cursor-col-resize touch-none select-none hover:bg-accent/30"
                            />
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedRows.map((row) => (
                      <tr
                        key={row.__rowId}
                        className={`group divide-x divide-border/60 transition-colors duration-150 hover:bg-surface/70 ${
                          selected.has(row.__rowId) ? 'bg-accent-soft/40' : ''
                        }`}
                      >
                        <td className="px-3 py-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={selected.has(row.__rowId)}
                            onChange={() => toggleRow(row.__rowId)}
                            aria-label={t.selectRow}
                            className="h-3.5 w-3.5 accent-accent"
                          />
                        </td>
                        {visibleColumns.map((c) => (
                          <td key={c.id} className={`truncate px-4 py-3 align-middle ${ALIGN_CLASSES[c.align ?? 'left']}`}>
                            {c.render(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{t.rowsPerPage}</span>
              <select
                value={pageSize}
                onChange={(e) => persistPageSize(Number(e.target.value))}
                className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>
                {t.showingRange
                  .replace('{from}', String((safePage - 1) * pageSize + 1))
                  .replace('{to}', String(Math.min(safePage * pageSize, sortedRows.length)))
                  .replace('{total}', String(sortedRows.length))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 items-center rounded-lg border border-border px-3 font-medium text-foreground transition duration-200 hover:border-accent-hover/50 disabled:pointer-events-none disabled:opacity-40"
              >
                {t.previous}
              </button>
              <span>
                {t.page} {safePage} {t.of} {pageCount}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                className="inline-flex h-8 items-center rounded-lg border border-border px-3 font-medium text-foreground transition duration-200 hover:border-accent-hover/50 disabled:pointer-events-none disabled:opacity-40"
              >
                {t.next}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
