import 'server-only'
import { WHATSAPP_LINK, EMAIL_ADDRESS } from '@/src/lib/contact-info'
import { renderCta, renderEmailShell, renderInfoCard, renderParagraph, escapeHtml } from '../layout'
import type { VehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'
import type { Locale } from '@/src/i18n/config'

const PLACEHOLDER_WHATSAPP_LINK = 'https://wa.me/221000000000'
const hasRealWhatsapp = WHATSAPP_LINK !== PLACEHOLDER_WHATSAPP_LINK

export type VehicleRequestStatusUpdateEmailData = {
  requestNumber: string
  locale: Locale
  status: VehicleRequestStatus
  customerName: string
}

const COPY: Record<VehicleRequestStatus, { fr: { label: string; body: string }; en: { label: string; body: string } }> = {
  request_received: {
    fr: { label: 'Demande reçue', body: 'Nous avons bien reçu votre demande et allons l’examiner prochainement.' },
    en: { label: 'Request received', body: 'We\'ve received your request and will review it shortly.' },
  },
  on_treatment: {
    fr: { label: 'Demande en cours de traitement', body: 'Notre équipe recherche activement le véhicule que vous souhaitez.' },
    en: { label: 'Request in progress', body: 'Our team is actively sourcing the vehicle you\'re looking for.' },
  },
  vehicle_found: {
    fr: {
      label: 'Véhicule trouvé',
      body: 'Bonne nouvelle : nous avons trouvé un véhicule correspondant à vos critères. Nous allons vous contacter pour la suite.',
    },
    en: {
      label: 'Vehicle found',
      body: 'Good news: we\'ve found a vehicle matching your criteria. We\'ll be in touch about next steps.',
    },
  },
  direct_communication: {
    fr: { label: 'Nous allons vous contacter', body: 'Un membre de notre équipe va vous contacter directement.' },
    en: { label: 'We will contact you', body: 'A member of our team will reach out to you directly.' },
  },
  closed: {
    fr: { label: 'Demande terminée', body: 'Cette demande est maintenant terminée. Merci de votre confiance.' },
    en: { label: 'Request completed', body: 'This request has now been completed. Thank you for choosing Dakar Auto.' },
  },
  cancelled: {
    fr: {
      label: 'Demande annulée',
      body: 'Cette demande a été annulée. Contactez-nous si vous pensez qu’il s’agit d’une erreur.',
    },
    en: { label: 'Request cancelled', body: 'This request has been cancelled. Contact us if you believe this is a mistake.' },
  },
}

export function buildVehicleRequestStatusUpdateEmail(data: VehicleRequestStatusUpdateEmailData): {
  subject: string
  html: string
} {
  return data.locale === 'en' ? buildEn(data) : buildFr(data)
}

function buildFr(data: VehicleRequestStatusUpdateEmailData): { subject: string; html: string } {
  const copy = COPY[data.status].fr
  const subject = `${copy.label} — ${data.requestNumber}`

  const body = `
    ${renderParagraph(`Bonjour ${escapeHtml(data.customerName)},`)}
    ${renderInfoCard('Mise à jour de votre demande de véhicule', [
      { label: 'N° de demande', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
      { label: 'Nouveau statut', value: escapeHtml(copy.label) },
    ])}
    ${renderParagraph(copy.body)}
    ${hasRealWhatsapp ? renderCta(WHATSAPP_LINK, 'Discuter sur WhatsApp') : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Nous contacter par e-mail')}
  `

  const html = renderEmailShell({
    preheader: `${copy.label} — demande de véhicule ${data.requestNumber}`,
    title: subject,
    body,
    footer: `Dakar Auto — Recherche et importation de véhicules.<br />Cet e-mail concerne votre demande ${escapeHtml(data.requestNumber)}.`,
  })

  return { subject, html }
}

function buildEn(data: VehicleRequestStatusUpdateEmailData): { subject: string; html: string } {
  const copy = COPY[data.status].en
  const subject = `${copy.label} — ${data.requestNumber}`

  const body = `
    ${renderParagraph(`Hello ${escapeHtml(data.customerName)},`)}
    ${renderInfoCard('Vehicle request update', [
      { label: 'Request number', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
      { label: 'New status', value: escapeHtml(copy.label) },
    ])}
    ${renderParagraph(copy.body)}
    ${hasRealWhatsapp ? renderCta(WHATSAPP_LINK, 'Chat on WhatsApp') : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Contact us by email')}
  `

  const html = renderEmailShell({
    preheader: `${copy.label} — vehicle request ${data.requestNumber}`,
    title: subject,
    body,
    footer: `Dakar Auto — Vehicle sourcing and import.<br />This email is about your request ${escapeHtml(data.requestNumber)}.`,
  })

  return { subject, html }
}
