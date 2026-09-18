'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ListChecks, ChevronDown, RefreshCw, FileDown, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
  danger,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition duration-150 disabled:pointer-events-none disabled:opacity-40 ${
        danger ? 'text-red-600 hover:bg-red-500/10 dark:text-red-400' : 'text-foreground hover:bg-surface'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${danger ? '' : 'text-muted-foreground'}`} strokeWidth={1.9} />
      <span className="truncate">{label}</span>
    </button>
  )
}

// "Actions" dropdown for the bulk-selection toolbar — appears next to the
// "X selected / Clear" chip in data-table.tsx once at least one row is
// selected. Pure presentation: every click just forwards to a callback —
// the actual status-change/export/archive/restore/delete logic lives in
// data-table.tsx, which owns selection state and the per-table
// BulkActionsConfig (see requests-table.tsx / vehicle-requests-table.tsx).
export function BulkActionsMenu({
  dict,
  onChangeStatus,
  onExportSelected,
  archiveMode,
  onArchiveOrRestoreSelected,
  onDeletePermanently,
}: {
  dict: Dictionary
  onChangeStatus: () => void
  onExportSelected: () => void
  // 'archive' in the Active/All view, 'restore' in the Archived view — see
  // BulkActionsConfig.view's comment in data-table.tsx.
  archiveMode: 'archive' | 'restore'
  onArchiveOrRestoreSelected: () => void
  onDeletePermanently: () => void
}) {
  const t = dict.admin.bulkActions
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function run(action: () => void) {
    action()
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft px-3 text-xs font-medium text-accent transition duration-200 hover:border-accent hover:bg-accent-soft/80"
      >
        <ListChecks className="h-3.5 w-3.5" strokeWidth={2} />
        {t.actionsButton}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1.5 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-card-hover"
        >
          <MenuItem icon={RefreshCw} label={t.changeStatus} onClick={() => run(onChangeStatus)} />
          <MenuItem icon={FileDown} label={t.exportSelected} onClick={() => run(onExportSelected)} />
          <MenuItem
            icon={archiveMode === 'restore' ? ArchiveRestore : Archive}
            label={archiveMode === 'restore' ? t.restoreSelected : t.archiveSelected}
            onClick={() => run(onArchiveOrRestoreSelected)}
          />

          <div className="my-1.5 border-t border-border" />

          <MenuItem icon={Trash2} label={t.deletePermanently} onClick={() => run(onDeletePermanently)} danger />
        </div>
      )}
    </div>
  )
}
