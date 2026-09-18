import type { Dictionary } from '@/src/i18n/dictionaries'
import type { StatusHistoryEntry } from '@/src/services/admin/queries'
import { statusLabel } from './status-badge'

// The four forward-progression statuses shown as steps — 'closed' and
// 'cancelled' are terminal side-exits, not stops on this funnel, so they're
// intentionally left out (matches REQUEST_STATUSES minus those two).
const CORE_STEPS = ['request_received', 'on_treatment', 'parts_found', 'direct_communication'] as const

function formatStepDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function StatusStepper({
  dict,
  currentStatus,
  createdAt,
  history,
  locale,
}: {
  dict: Dictionary
  currentStatus: string
  createdAt: string
  history: StatusHistoryEntry[]
  locale: string
}) {
  const t = dict.admin.detail
  const descriptions = t.statusStepDescriptions as Record<string, string>

  // Real timestamps only, pulled from the real status-history log — never
  // invented. getStatusHistory returns newest-first, so walking it in
  // chronological (oldest-first) order and keeping the first write per
  // status gives the moment each status was *first* reached.
  const reachedAt = new Map<string, string>()
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    if (!reachedAt.has(entry.new_status)) reachedAt.set(entry.new_status, entry.created_at)
  }
  // request_received is set at insert time and never logged as a history
  // transition, so it falls back to the request's own creation date.
  if (!reachedAt.has('request_received')) reachedAt.set('request_received', createdAt)

  return (
    <ol>
      {CORE_STEPS.map((step, index) => {
        const isActive = step === currentStatus
        const isLast = index === CORE_STEPS.length - 1
        const dateLabel = reachedAt.get(step)

        return (
          <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={`absolute top-8 left-[15px] h-[calc(100%-1.75rem)] w-px ${isActive ? 'bg-accent/40' : 'bg-border'}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isActive ? 'bg-accent text-accent-foreground shadow-[var(--glow-shadow)]' : 'border border-border bg-surface text-muted-foreground'
              }`}
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pt-1">
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isActive ? 'text-accent' : 'text-foreground/80'}`}>{statusLabel(dict, step)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{descriptions[step]}</p>
              </div>
              {isActive && dateLabel && (
                <span className="shrink-0 text-right text-xs whitespace-nowrap text-muted-foreground">{formatStepDate(dateLabel, locale)}</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
