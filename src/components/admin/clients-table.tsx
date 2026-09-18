'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { ClientRow } from '@/src/services/admin/queries'
import { inputClass } from '@/src/components/ui/styles'
import { AdminDataTable, type AdminColumn } from './data-table'
import { AdminWatermark } from './admin-watermark'

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium' }).format(new Date(iso))
}

// AdminDataTable takes row identity from a plain `__rowId` field, not a
// callback (see data-table.tsx) — `key` is listClients()'s own normalized,
// already-unique contact identity (phone, falling back to email/name), so
// it's reused as-is here rather than inventing a second identifier.
type Row = ClientRow & { __rowId: string }

// Client-side search only — `clients` is the full reconstructed list from
// listClients() (see src/services/admin/queries.ts), already capped and
// small enough to filter in the browser without another round trip.
export function ClientsTable({ dict, clients, locale }: { dict: Dictionary; clients: ClientRow[]; locale: string }) {
  const t = dict.admin.clients
  const [search, setSearch] = useState('')

  const filtered: Row[] = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? clients.filter(
          (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
        )
      : clients
    return base.map((row) => ({ ...row, __rowId: row.key }))
  }, [clients, search])

  // Every column centered per the design brief (Clients specifically —
  // requests/vehicle-requests keep left alignment, better for scanning
  // names/dates there).
  const columns: AdminColumn<Row>[] = [
    {
      id: 'name',
      label: t.name,
      defaultWidth: 200,
      minWidth: 140,
      sortable: true,
      align: 'center',
      sortValue: (row) => row.name,
      csvValue: (row) => row.name,
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: 'email',
      label: t.email,
      defaultWidth: 220,
      minWidth: 140,
      sortable: true,
      align: 'center',
      sortValue: (row) => row.email ?? '',
      csvValue: (row) => row.email ?? '',
      render: (row) => row.email ?? <span className="text-muted-foreground">{t.notProvided}</span>,
    },
    {
      id: 'phone',
      label: t.phone,
      defaultWidth: 160,
      minWidth: 120,
      sortable: true,
      align: 'center',
      sortValue: (row) => row.phone,
      csvValue: (row) => row.phone,
      render: (row) => row.phone,
    },
    {
      id: 'whatsapp',
      label: t.whatsapp,
      defaultWidth: 160,
      minWidth: 120,
      sortable: true,
      align: 'center',
      sortValue: (row) => row.whatsapp ?? '',
      csvValue: (row) => row.whatsapp ?? '',
      render: (row) => row.whatsapp ?? <span className="text-muted-foreground">{t.notProvided}</span>,
    },
    {
      id: 'requestsCount',
      label: t.requestsCount,
      defaultWidth: 150,
      minWidth: 110,
      sortable: true,
      align: 'center',
      sortValue: (row) => row.requestsCount,
      csvValue: (row) => String(row.requestsCount),
      render: (row) => <span className="tabular-nums">{row.requestsCount}</span>,
    },
    {
      id: 'lastRequest',
      label: t.lastRequest,
      defaultWidth: 160,
      minWidth: 120,
      sortable: true,
      align: 'center',
      sortValue: (row) => new Date(row.lastRequestAt).getTime(),
      csvValue: (row) => formatDate(row.lastRequestAt, locale),
      render: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.lastRequestAt, locale)}</span>,
    },
    {
      id: 'action',
      label: '',
      defaultWidth: 90,
      minWidth: 80,
      alwaysVisible: true,
      align: 'center',
      render: (row) => (
        <Link
          href={`/admin/requests?q=${encodeURIComponent(row.phone)}`}
          className="font-medium text-accent transition duration-200 hover:underline"
        >
          {t.view}
        </Link>
      ),
    },
  ]

  return (
    <div className="relative space-y-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t.searchPlaceholder}
        className={`max-w-sm ${inputClass}`}
      />
      <AdminDataTable
        dict={dict}
        locale={locale}
        storageKey="admin-clients-table"
        columns={columns}
        rows={filtered}
        emptyMessage={t.empty}
        exportFileName="clients"
        reportTitle={t.title}
        filtersSummary={search ? `${dict.admin.tableControls.filterSearchLabel}: ${search}` : undefined}
      />
      <AdminWatermark />
    </div>
  )
}
