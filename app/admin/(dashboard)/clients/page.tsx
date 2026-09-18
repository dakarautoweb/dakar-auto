import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { listClients } from '@/src/services/admin/queries'
import { ClientsTable } from '@/src/components/admin/clients-table'

export default async function AdminClientsPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  const clients = await listClients()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{dict.admin.clients.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.admin.clients.subtitle}</p>
      </div>

      <ClientsTable dict={dict} clients={clients} locale={locale} />
    </div>
  )
}
