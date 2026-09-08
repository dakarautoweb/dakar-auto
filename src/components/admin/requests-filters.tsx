'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { REQUEST_STATUSES } from '@/src/services/admin/statuses'

export function RequestsFilters({
  dict,
  initialSearch,
  initialStatus,
  initialSort,
}: {
  dict: Dictionary
  initialSearch: string
  initialStatus: string
  initialSort: string
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch)

  function navigate(next: { search?: string; status?: string; sort?: string }) {
    const params = new URLSearchParams()
    const q = next.search ?? search
    const status = next.status ?? initialStatus
    const sort = next.sort ?? initialSort

    if (q) params.set('q', q)
    if (status && status !== 'all') params.set('status', status)
    if (sort && sort !== 'newest') params.set('sort', sort)

    const query = params.toString()
    startTransition(() => router.push(query ? `/admin/requests?${query}` : '/admin/requests'))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        navigate({ search })
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={dict.admin.requests.searchPlaceholder}
        className="w-full flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />

      <select
        value={initialStatus}
        onChange={(e) => navigate({ status: e.target.value })}
        className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="all">{dict.admin.requests.statusAll}</option>
        {REQUEST_STATUSES.map((status) => (
          <option key={status} value={status}>
            {(dict.admin.statuses as Record<string, string>)[status]}
          </option>
        ))}
      </select>

      <select
        value={initialSort}
        onChange={(e) => navigate({ sort: e.target.value })}
        className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="newest">{dict.admin.requests.sortNewest}</option>
        <option value="oldest">{dict.admin.requests.sortOldest}</option>
      </select>
    </form>
  )
}
