import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PartsRequestRow } from '@/src/services/admin/queries'
import { StatusBadge } from './status-badge'

function vehicleLabel(row: PartsRequestRow): string {
  if (!row.vehicles) return '—'
  return [row.vehicles.year, row.vehicles.make, row.vehicles.model].filter(Boolean).join(' ') || '—'
}

function partSummary(row: PartsRequestRow): string {
  const first = row.parts_request_items[0]
  if (!first) return '—'
  const extra = row.parts_request_items.length - 1
  return extra > 0 ? `${first.part_name} (+${extra})` : first.part_name
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  )
}

export function RequestsTable({ dict, rows, locale }: { dict: Dictionary; rows: PartsRequestRow[]; locale: string }) {
  const t = dict.admin.table

  if (rows.length === 0) {
    return <p className="rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted-foreground">{t.empty}</p>
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
              <th className="px-4 py-3">{t.part}</th>
              <th className="px-4 py-3">{t.status}</th>
              <th className="px-4 py-3">{t.preferredContact}</th>
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
                <td className="px-4 py-3">{partSummary(row)}</td>
                <td className="px-4 py-3">
                  <StatusBadge dict={dict} status={row.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{row.preferred_contact_method}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/requests/${row.id}`} className="font-medium text-accent hover:underline">
                    {t.open}
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
            href={`/admin/requests/${row.id}`}
            className="block rounded-xl border border-border bg-surface/40 p-4 transition hover:border-accent"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{row.request_number}</p>
                <p className="mt-0.5 font-semibold">{row.customer_name}</p>
              </div>
              <StatusBadge dict={dict} status={row.status} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{vehicleLabel(row)} · {partSummary(row)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.created_at, locale)}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
