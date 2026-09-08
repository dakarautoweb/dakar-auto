import 'server-only'
import { renderEmailShell, renderInfoCard, renderParagraph, escapeHtml } from '../layout'
import { resolveCategoryLabel, resolveConditionLabel, resolvePreferredContactLabel, resolveSideLabel } from '../labels'
import type { PartsRequestEmailData } from '../types'

function vehicleLine(vehicle: PartsRequestEmailData['vehicle']): string {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date) + ' UTC'
}

// Admin notifications are always in French — the operations team is
// French-speaking regardless of the customer's chosen locale.
export function buildAdminNotificationEmail(data: PartsRequestEmailData): { subject: string; html: string } {
  const subject = `Nouvelle demande de pièces — ${data.requestNumber}`

  const categoryLabel = resolveCategoryLabel('fr', data.part.categoryKey)
  const conditionLabel = resolveConditionLabel('fr', data.part.condition)
  const sideLabel = resolveSideLabel('fr', data.part.side)
  const preferredContactLabel = resolvePreferredContactLabel('fr', data.contact.preferredContact)

  const rows = [
    { label: 'N° de demande', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
    { label: 'Client', value: escapeHtml(data.contact.name) },
    { label: 'Téléphone', value: escapeHtml(data.contact.phone) },
    { label: 'E-mail', value: data.contact.email ? escapeHtml(data.contact.email) : 'Non renseigné' },
    { label: 'Contact préféré', value: escapeHtml(preferredContactLabel) },
    ...(data.contact.whatsappPhone ? [{ label: 'WhatsApp', value: escapeHtml(data.contact.whatsappPhone) }] : []),
    { label: 'VIN', value: data.vehicle.vin ? `<span style="font-family:monospace;">${escapeHtml(data.vehicle.vin)}</span>` : 'Non renseigné' },
    { label: 'Véhicule', value: escapeHtml(vehicleLine(data.vehicle)) },
    { label: 'Pièce demandée', value: escapeHtml([categoryLabel, data.part.partName].filter(Boolean).join(' — ')) },
    {
      label: 'Détails',
      value: escapeHtml([sideLabel, conditionLabel, `Quantité : ${data.part.quantity}`].filter(Boolean).join(' · ')),
    },
    { label: 'Reçue le', value: escapeHtml(formatTimestamp(data.submittedAt)) },
    ...(data.attachmentCount
      ? [
          {
            label: 'Photos',
            value: `${data.attachmentCount} photo${data.attachmentCount > 1 ? 's' : ''} jointe${data.attachmentCount > 1 ? 's' : ''} à la demande`,
          },
        ]
      : []),
  ]

  const body = `
    ${renderParagraph("Une nouvelle demande de pièces vient d'être soumise sur le site.")}
    ${renderInfoCard('Détails de la demande', rows)}
    ${
      data.part.description
        ? renderInfoCard('Description fournie par le client', [
            { label: '', value: escapeHtml(data.part.description).replace(/\n/g, '<br />') },
          ])
        : ''
    }
  `

  const html = renderEmailShell({
    preheader: `Nouvelle demande ${data.requestNumber} de ${data.contact.name}.`,
    title: subject,
    body,
    footer: `Dakar Auto — Notification interne.<br />Cette demande a été enregistrée dans Supabase sous le numéro ${escapeHtml(data.requestNumber)}.`,
  })

  return { subject, html }
}
