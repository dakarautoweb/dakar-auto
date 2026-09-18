import 'server-only'
import { WHATSAPP_LINK, EMAIL_ADDRESS, HAS_REAL_WHATSAPP } from '@/src/lib/contact-info'
import { renderCta, renderEmailShell, renderInfoCard, renderParagraph, escapeHtml, CUSTOMER_EMAIL_THEME } from '../layout'
import { resolveCategoryLabel } from '../labels'
import type { PartsRequestEmailData } from '../types'

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
    ${renderParagraph('Suivez l’avancement de votre demande à tout moment, sans créer de compte :')}
    ${renderCta(data.trackingUrl, 'Suivre ma demande', CUSTOMER_EMAIL_THEME)}
    ${renderParagraph(
      `Une question en attendant ? Contactez-nous directement, en indiquant votre numéro de demande.`
    )}
    ${HAS_REAL_WHATSAPP ? renderCta(WHATSAPP_LINK, 'Discuter sur WhatsApp', CUSTOMER_EMAIL_THEME) : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Nous contacter par e-mail', CUSTOMER_EMAIL_THEME)}
  `

  const html = renderEmailShell({
    preheader: `Votre demande ${data.requestNumber} a été reçue par Dakar Auto.`,
    title: subject,
    body,
    footer: `Dakar Auto — Pièces détachées automobiles.<br />Cet e-mail confirme la réception de votre demande ${escapeHtml(data.requestNumber)}. Vous n'avez rien à faire pour le moment.`,
    theme: CUSTOMER_EMAIL_THEME,
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
    ${renderParagraph('Track the progress of your request any time, no account needed:')}
    ${renderCta(data.trackingUrl, 'Track My Request', CUSTOMER_EMAIL_THEME)}
    ${renderParagraph(`Have a question in the meantime? Reach out directly and mention your request number.`)}
    ${HAS_REAL_WHATSAPP ? renderCta(WHATSAPP_LINK, 'Chat on WhatsApp', CUSTOMER_EMAIL_THEME) : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Contact us by email', CUSTOMER_EMAIL_THEME)}
  `

  const html = renderEmailShell({
    preheader: `Your request ${data.requestNumber} has been received by Dakar Auto.`,
    title: subject,
    body,
    footer: `Dakar Auto — Automotive spare parts.<br />This email confirms receipt of your request ${escapeHtml(data.requestNumber)}. No action is needed from you right now.`,
    theme: CUSTOMER_EMAIL_THEME,
  })

  return { subject, html }
}
