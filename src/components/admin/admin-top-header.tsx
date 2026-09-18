'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { Locale } from '@/src/i18n/config'

// Live clock — rendered empty until mount so the server-rendered markup
// never has to guess "now" (which would mismatch the client's own clock and
// trigger a hydration warning); it fills in and starts ticking client-side
// only.
function AdminClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // One-time sync with an external system (the wall clock) on mount —
    // the case React's own docs carve out as a legitimate Effect, hence
    // the targeted disable rather than restructuring it away.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (!now) return <span className="tabular-nums opacity-0">—</span>

  const formatted = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now)

  return <span className="tabular-nums capitalize">{formatted}</span>
}

// Global search — submits to the parts-requests page's existing server-side
// search (RequestsFilters -> listPartsRequests), which already covers
// request number / customer name / phone / email / VIN (see
// src/services/admin/queries.ts). This bar is just a shortcut into that,
// not a second search implementation.
function GlobalSearch({ dict }: { dict: Dictionary }) {
  const router = useRouter()
  const [value, setValue] = useState('')

  // Below sm the desktop max-w-sm cap is off entirely so the bar fills the
  // header's content width and the control grows to a 48px touch height;
  // from sm up it's the original `w-full max-w-sm` / h-10, untouched.
  return (
    <form
      role="search"
      aria-label={dict.admin.topbar.searchAria}
      onSubmit={(e) => {
        e.preventDefault()
        const q = value.trim()
        router.push(q ? `/admin/requests?q=${encodeURIComponent(q)}` : '/admin/requests')
      }}
      className="relative w-full sm:max-w-sm"
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-muted-foreground sm:left-3 sm:h-4 sm:w-4"
        strokeWidth={2}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={dict.admin.topbar.searchPlaceholder}
        className="h-12 w-full rounded-xl border border-border bg-surface-raised pl-11 pr-3 text-[15px] text-foreground shadow-sm transition duration-200 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 sm:h-10 sm:pl-9 sm:text-sm"
      />
    </form>
  )
}

export function AdminTopHeader({
  dict,
  locale,
  adminName,
}: {
  dict: Dictionary
  locale: Locale
  adminName: string
}) {
  const greeting = dict.admin.topbar.greeting.replace('{name}', adminName)

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      {/* Mobile stacks greeting over a full-width search row; from sm up this
          is the original single wrapping row (flex-wrap / justify-between /
          gap-4), so the lg+ header is byte-identical in effect. */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{greeting}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dict.admin.topbar.subtitle}</p>
        </div>
        <div className="flex w-full items-center gap-4 sm:w-auto">
          <GlobalSearch dict={dict} />
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline-block">
            <AdminClock locale={locale} />
          </span>
        </div>
      </div>
    </div>
  )
}
