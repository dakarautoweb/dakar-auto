import 'server-only'
import { WHATSAPP_LINK, EMAIL_ADDRESS } from '@/src/lib/contact-info'
import { renderCta, renderEmailShell, renderInfoCard, renderParagraph, escapeHtml } from '../layout'
import { resolveCategoryLabel } from '../labels'
import type { PartsRequestEmailData } from '../types'

// contact-info.ts ships with placeholder values until Dakar Auto's real
// WhatsApp line is configured — don't show a CTA that goes nowhere useful.
const PLACEHOLDER_WHATSAPP_LINK = 'https://wa.me/221000000000'
const hasRealWhatsapp = WHATSAPP_LINK !== PLACEHOLDER_WHATSAPP_LINK

function vehicleLine(vehicle: PartsRequestEmailData['vehicle']): string {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
}

export function buildCustomerConfirmationEmail(data: PartsRequestEmailData): { subject: string; html: string } {
  return data.locale === 'en' ? buildEn(data) : buildFr(data)
}

function buildFr(data: PartsRequestEmailData): { subject: string; html: string } {
  const subject = `Demande reçue — ${data.requestNumber}`
  const categoryLabel = resolveCategoryLabel('fr', data.part.categoryKey)
  const partLabel = [categoryLabel, data.part.partName].filter(Boolean).join(' — ')

  const body = `
    ${renderParagraph(`Bonjour ${escapeHtml(data.contact.name)},`)}
    ${renderParagraph(
      `Nous avons bien reçu votre demande de pièce détachée. Notre équipe va l'examiner et vous contactera prochainement pour la suite.`
    )}
    ${renderInfoCard('Résumé de la demande', [
      { label: 'N° de demande', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
      { label: 'Véhicule', value: escapeHtml(vehicleLine(data.vehicle)) },
      { label: 'Pièce demandée', value: escapeHtml(partLabel) },
      { label: 'Statut actuel', value: 'Demande reçue' },
    ])}
    ${renderParagraph(
      `Une question en attendant ? Contactez-nous directement, en indiquant votre numéro de demande.`
    )}
    ${hasRealWhatsapp ? renderCta(WHATSAPP_LINK, 'Discuter sur WhatsApp') : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Nous contacter par e-mail')}
  `

  const html = renderEmailShell({
    preheader: `Votre demande ${data.requestNumber} a été reçue par Dakar Auto.`,
    title: subject,
    body,
    footer: `Dakar Auto — Pièces détachées automobiles.<br />Cet e-mail confirme la réception de votre demande ${escapeHtml(data.requestNumber)}. Vous n'avez rien à faire pour le moment.`,
  })

  return { subject, html }
}

function buildEn(data: PartsRequestEmailData): { subject: string; html: string } {
  const subject = `Request received — ${data.requestNumber}`
  const categoryLabel = resolveCategoryLabel('en', data.part.categoryKey)
  const partLabel = [categoryLabel, data.part.partName].filter(Boolean).join(' — ')

  const body = `
    ${renderParagraph(`Hello ${escapeHtml(data.contact.name)},`)}
    ${renderParagraph(
      `We've received your parts request. Our team will review it and reach out to you shortly with next steps.`
    )}
    ${renderInfoCard('Request summary', [
      { label: 'Request number', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
      { label: 'Vehicle', value: escapeHtml(vehicleLine(data.vehicle)) },
      { label: 'Requested part', value: escapeHtml(partLabel) },
      { label: 'Current status', value: 'Request received' },
    ])}
    ${renderParagraph(`Have a question in the meantime? Reach out directly and mention your request number.`)}
    ${hasRealWhatsapp ? renderCta(WHATSAPP_LINK, 'Chat on WhatsApp') : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Contact us by email')}
  `

  const html = renderEmailShell({
    preheader: `Your request ${data.requestNumber} has been received by Dakar Auto.`,
    title: subject,
    body,
    footer: `Dakar Auto — Automotive spare parts.<br />This email confirms receipt of your request ${escapeHtml(data.requestNumber)}. No action is needed from you right now.`,
  })

  return { subject, html }
}
