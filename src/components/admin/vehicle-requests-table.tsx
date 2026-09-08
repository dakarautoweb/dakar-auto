import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { VehicleRequestRow } from '@/src/services/admin/queries'
import { StatusBadge } from './status-badge'

function vehicleLabel(row: VehicleRequestRow): string {
  const years = [row.year_from, row.year_to].filter(Boolean)
  const yearRange = years.length === 2 && row.year_from !== row.year_to ? `${row.year_from}–${row.year_to}` : years[0] ? String(years[0]) : ''
  return [yearRange, row.make, row.model].filter(Boolean).join(' ') || '—'
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

export function VehicleRequestsTable({ dict, rows, locale }: { dict: Dictionary; rows: VehicleRequestRow[]; locale: string }) {
  const t = dict.admin.vehicleRequests.table
  const openLabel = dict.admin.table.open

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted-foreground">
        {dict.admin.vehicleRequests.empty}
      </p>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/60 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">{t.requestNumber}</th>
              <th className="px-4 py-3">{t.date}</th>
              <th className="px-4 py-3">{t.customer}</th>
              <th className="px-4 py-3">{t.vehicle}</th>
              <th className="px-4 py-3">{t.status}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface/40">
                <td className="px-4 py-3 font-mono text-xs">{row.request_number}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(row.created_at, locale)}</td>
                <td className="px-4 py-3 font-medium">{row.customer_name}</td>
                <td className="px-4 py-3">{vehicleLabel(row)}</td>
                <td className="px-4 py-3">
                  <StatusBadge dict={dict} status={row.status} statusMap={dict.admin.vehicleStatuses} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/vehicle-requests/${row.id}`} className="font-medium text-accent hover:underline">
                    {openLabel}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/admin/vehicle-requests/${row.id}`}
            className="block rounded-xl border border-border bg-surface/40 p-4 transition hover:border-accent"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{row.request_number}</p>
                <p className="mt-0.5 font-semibold">{row.customer_name}</p>
              </div>
              <StatusBadge dict={dict} status={row.status} statusMap={dict.admin.vehicleStatuses} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{vehicleLabel(row)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.created_at, locale)}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
