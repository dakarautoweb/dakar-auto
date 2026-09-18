'use client'

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ChevronDown, Copy, Download, FileSpreadsheet, FileText, Mail, Printer, Share2, Table as TableIcon } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition duration-150 hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.9} />
      <span className="truncate">{label}</span>
    </button>
  )
}

function GroupLabel({ children }: { children: string }) {
  return <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold tracking-widest text-muted-foreground/80 uppercase">{children}</div>
}

// Premium "Export / Share" dropdown replacing the old single Export button
// — two labeled groups (Export: Print/PDF/Excel/CSV/Copy — Share: Email/
// Share selected/Download report), each item with its own icon. All the
// actual export/share logic lives in data-table.tsx (this component only
// renders the menu and forwards clicks) since it needs the table's own
// visible/filtered/sorted rows and selection state.
export function ExportShareMenu({
  dict,
  hasSelection,
  onPrint,
  onPdf,
  onExcel,
  onCsv,
  onCopyTable,
  onEmail,
  onShareSelected,
  onDownloadReport,
}: {
  dict: Dictionary
  hasSelection: boolean
  onPrint: () => void
  onPdf: () => void
  onExcel: () => void
  onCsv: () => void
  onCopyTable: () => void
  onEmail: () => void
  onShareSelected: () => void
  onDownloadReport: () => void
}) {
  const t = dict.admin.tableControls
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
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
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition duration-200 hover:border-accent-hover/50"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2} />
        {t.exportShare}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1.5 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-card-hover"
        >
          <GroupLabel>{t.exportGroupLabel}</GroupLabel>
          <MenuItem icon={Printer} label={t.print} onClick={() => run(onPrint)} />
          <MenuItem icon={FileText} label={t.pdf} onClick={() => run(onPdf)} />
          <MenuItem icon={FileSpreadsheet} label={t.excel} onClick={() => run(onExcel)} />
          <MenuItem icon={TableIcon} label={t.csv} onClick={() => run(onCsv)} />
          <MenuItem icon={Copy} label={t.copyTable} onClick={() => run(onCopyTable)} />

          <div className="my-1.5 border-t border-border" />

          <GroupLabel>{t.shareGroupLabel}</GroupLabel>
          <MenuItem icon={Mail} label={t.sendByEmail} onClick={() => run(onEmail)} />
          <MenuItem icon={Share2} label={t.shareSelectedRows} onClick={() => run(onShareSelected)} disabled={!hasSelection} />
          <MenuItem icon={Download} label={t.downloadReport} onClick={() => run(onDownloadReport)} />
        </div>
      )}
    </div>
  )
}
