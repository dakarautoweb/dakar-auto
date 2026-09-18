'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'

// Compact single-request archive/restore control for a detail page header —
// deliberately not a full overflow/kebab menu (there's only ever this one
// action here), and deliberately not a modal (archive/restore are both
// reversible, unlike Delete permanently, which stays its own separate,
// confirmed, red action — see bulk-delete-modal.tsx). Reuses the exact same
// bulk server action with a single-id array, never a separate code path.
export function ArchiveToggleButton({
  dict,
  requestId,
  archivedAt,
  archiveAction,
  restoreAction,
}: {
  dict: Dictionary
  requestId: string
  archivedAt: string | null
  archiveAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>
  restoreAction: (ids: string[]) => Promise<{ ok: boolean; error?: string }>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const t = dict.admin.tableControls
  const isArchived = Boolean(archivedAt)

  function handleClick() {
    startTransition(async () => {
      const result = isArchived ? await restoreAction([requestId]) : await archiveAction([requestId])
      if (result.ok) router.refresh()
    })
  }

  const Icon = isArchived ? ArchiveRestore : Archive

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-muted-foreground transition duration-200 hover:border-accent-hover hover:text-accent-hover disabled:pointer-events-none disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {isArchived ? t.restoreRequestAction : t.archiveRequestAction}
    </button>
  )
}
