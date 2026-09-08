import type { Dictionary } from '@/src/i18n/dictionaries'
import type { StatusHistoryEntry } from '@/src/services/admin/queries'
import { statusLabel } from './status-badge'

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

export function StatusHistoryList({
  dict,
  entries,
  locale,
}: {
  dict: Dictionary
  entries: StatusHistoryEntry[]
  locale: string
}) {
  const t = dict.admin.detail

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.historyEmpty}</p>
  }

  return (
    <ol className="space-y-4 border-l border-border pl-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-accent" />
          <p className="text-sm font-medium">
            {entry.old_status ? (
              <>
                {statusLabel(dict, entry.old_status)} → {statusLabel(dict, entry.new_status)}
              </>
            ) : (
              statusLabel(dict, entry.new_status)
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(entry.created_at, locale)}
            {entry.changedByLabel ? ` · ${t.historyChangedBy} ${entry.changedByLabel}` : ''}
          </p>
          {entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
        </li>
      ))}
    </ol>
  )
}
