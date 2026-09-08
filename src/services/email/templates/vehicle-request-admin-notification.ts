import 'server-only'
import { renderEmailShell, renderInfoCard, renderParagraph, escapeHtml } from '../layout'
import { makeModelLine, yearRangeLine, mileageRangeLine, budgetRangeLine } from './vehicle-request-format'
import type { VehicleRequestEmailData } from '../vehicle-request-types'

function formatTimestamp(date: Date): string {
  return (
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC'
  )
}

const CONTACT_METHOD_LABELS_FR: Record<string, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Téléphone',
  email: 'E-mail',
}

// Admin notifications are always in French — same convention as the parts
// request admin email (the operations team is French-speaking regardless of
// the customer's chosen locale).
export function buildVehicleRequestAdminNotificationEmail(data: VehicleRequestEmailData): { subject: string; html: string } {
  const subject = `Nouvelle demande de véhicule — ${data.requestNumber}`

  const years = yearRangeLine(data.vehicle)
  const mileage = mileageRangeLine(data.vehicle)
  const budget = budgetRangeLine(data.vehicle)

  const rows = [
    { label: 'N° de demande', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
    { label: 'Client', value: escapeHtml(data.contact.name) },
    { label: 'Téléphone', value: escapeHtml(data.contact.phone) },
    { label: 'E-mail', value: data.contact.email ? escapeHtml(data.contact.email) : 'Non renseigné' },
    { label: 'Contact préféré', value: CONTACT_METHOD_LABELS_FR[data.contact.preferredContact] ?? data.contact.preferredContact },
    ...(data.contact.whatsappPhone ? [{ label: 'WhatsApp', value: escapeHtml(data.contact.whatsappPhone) }] : []),
    { label: 'Véhicule recherché', value: escapeHtml(makeModelLine(data.vehicle)) },
    ...(years ? [{ label: 'Années', value: escapeHtml(years) }] : []),
    ...(data.vehicle.color ? [{ label: 'Couleur', value: escapeHtml(data.vehicle.color) }] : []),
    ...(data.vehicle.engine ? [{ label: 'Moteur', value: escapeHtml(data.vehicle.engine) }] : []),
    ...(data.vehicle.transmission ? [{ label: 'Transmission', value: escapeHtml(data.vehicle.transmission) }] : []),
    ...(mileage ? [{ label: 'Kilométrage', value: escapeHtml(mileage) }] : []),
    ...(data.vehicle.trimLevel ? [{ label: 'Finition', value: escapeHtml(data.vehicle.trimLevel) }] : []),
    ...(budget ? [{ label: 'Budget', value: escapeHtml(budget) }] : []),
    { label: 'Reçue le', value: escapeHtml(formatTimestamp(data.submittedAt)) },
  ]

  const body = `
    ${renderParagraph("Une nouvelle demande de recherche de véhicule vient d'être soumise sur le site.")}
    ${renderInfoCard('Détails de la demande', rows)}
    ${
      data.vehicle.otherPreferences
        ? renderInfoCard('Autres préférences fournies par le client', [
            { label: '', value: escapeHtml(data.vehicle.otherPreferences).replace(/\n/g, '<br />') },
          ])
        : ''
    }
  `

  const html = renderEmailShell({
    preheader: `Nouvelle demande de véhicule ${data.requestNumber} de ${data.contact.name}.`,
    title: subject,
    body,
    footer: `Dakar Auto — Notification interne.<br />Cette demande a été enregistrée dans Supabase sous le numéro ${escapeHtml(data.requestNumber)}.`,
  })

  return { subject, html }
}
