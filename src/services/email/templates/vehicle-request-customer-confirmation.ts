import 'server-only'
import { WHATSAPP_LINK, EMAIL_ADDRESS, HAS_REAL_WHATSAPP } from '@/src/lib/contact-info'
import { renderCta, renderEmailShell, renderInfoCard, renderParagraph, escapeHtml, CUSTOMER_EMAIL_THEME } from '../layout'
import { makeModelLine, yearRangeLine, budgetRangeLine } from './vehicle-request-format'
import type { VehicleRequestEmailData } from '../vehicle-request-types'

export function buildVehicleRequestCustomerConfirmationEmail(data: VehicleRequestEmailData): { subject: string; html: string } {
  return data.locale === 'en' ? buildEn(data) : buildFr(data)
}

function buildFr(data: VehicleRequestEmailData): { subject: string; html: string } {
  const subject = `Demande de véhicule reçue — ${data.requestNumber}`
  const years = yearRangeLine(data.vehicle)
  const budget = budgetRangeLine(data.vehicle)

  const rows = [
    { label: 'N° de demande', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
    { label: 'Véhicule recherché', value: escapeHtml(makeModelLine(data.vehicle)) },
    ...(years ? [{ label: 'Années', value: escapeHtml(years) }] : []),
    ...(budget ? [{ label: 'Budget', value: escapeHtml(budget) }] : []),
    ...(data.vehicle.otherPreferences
      ? [{ label: 'Préférences', value: escapeHtml(data.vehicle.otherPreferences).replace(/\n/g, '<br />') }]
      : []),
    { label: 'Statut actuel', value: 'Demande reçue' },
  ]

  const body = `
    ${renderParagraph(`Bonjour ${escapeHtml(data.contact.name)},`)}
    ${renderParagraph(
      `Nous avons bien reçu votre demande de recherche de véhicule. Notre équipe va l'examiner et vous contactera prochainement pour la suite.`
    )}
    ${renderInfoCard('Résumé de la demande', rows)}
    ${renderParagraph('Suivez l’avancement de votre demande à tout moment, sans créer de compte :')}
    ${renderCta(data.trackingUrl, 'Suivre ma demande', CUSTOMER_EMAIL_THEME)}
    ${renderParagraph(`Une question en attendant ? Contactez-nous directement, en indiquant votre numéro de demande.`)}
    ${HAS_REAL_WHATSAPP ? renderCta(WHATSAPP_LINK, 'Discuter sur WhatsApp', CUSTOMER_EMAIL_THEME) : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Nous contacter par e-mail', CUSTOMER_EMAIL_THEME)}
  `

  const html = renderEmailShell({
    preheader: `Votre demande de véhicule ${data.requestNumber} a été reçue par Dakar Auto.`,
    title: subject,
    body,
    footer: `Dakar Auto — Recherche et importation de véhicules.<br />Cet e-mail confirme la réception de votre demande ${escapeHtml(data.requestNumber)}. Vous n'avez rien à faire pour le moment.`,
    theme: CUSTOMER_EMAIL_THEME,
  })

  return { subject, html }
}

function buildEn(data: VehicleRequestEmailData): { subject: string; html: string } {
  const subject = `Vehicle request received — ${data.requestNumber}`
  const years = yearRangeLine(data.vehicle)
  const budget = budgetRangeLine(data.vehicle)

  const rows = [
    { label: 'Request number', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
    { label: 'Vehicle wanted', value: escapeHtml(makeModelLine(data.vehicle)) },
    ...(years ? [{ label: 'Years', value: escapeHtml(years) }] : []),
    ...(budget ? [{ label: 'Budget', value: escapeHtml(budget) }] : []),
    ...(data.vehicle.otherPreferences
      ? [{ label: 'Preferences', value: escapeHtml(data.vehicle.otherPreferences).replace(/\n/g, '<br />') }]
      : []),
    { label: 'Current status', value: 'Request received' },
  ]

  const body = `
    ${renderParagraph(`Hello ${escapeHtml(data.contact.name)},`)}
    ${renderParagraph(
      `We've received your vehicle sourcing request. Our team will review it and reach out to you shortly with next steps.`
    )}
    ${renderInfoCard('Request summary', rows)}
    ${renderParagraph('Track the progress of your request any time, no account needed:')}
    ${renderCta(data.trackingUrl, 'Track My Request', CUSTOMER_EMAIL_THEME)}
    ${renderParagraph(`Have a question in the meantime? Reach out directly and mention your request number.`)}
    ${HAS_REAL_WHATSAPP ? renderCta(WHATSAPP_LINK, 'Chat on WhatsApp', CUSTOMER_EMAIL_THEME) : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Contact us by email', CUSTOMER_EMAIL_THEME)}
  `

  const html = renderEmailShell({
    preheader: `Your vehicle request ${data.requestNumber} has been received by Dakar Auto.`,
    title: subject,
    body,
    footer: `Dakar Auto — Vehicle sourcing and import.<br />This email confirms receipt of your request ${escapeHtml(data.requestNumber)}. No action is needed from you right now.`,
    theme: CUSTOMER_EMAIL_THEME,
  })

  return { subject, html }
}
