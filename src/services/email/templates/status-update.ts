import 'server-only'
import { WHATSAPP_LINK, EMAIL_ADDRESS } from '@/src/lib/contact-info'
import { renderCta, renderEmailShell, renderInfoCard, renderParagraph, escapeHtml } from '../layout'
import type { RequestStatus } from '@/src/services/admin/statuses'
import type { Locale } from '@/src/i18n/config'

const PLACEHOLDER_WHATSAPP_LINK = 'https://wa.me/221000000000'
const hasRealWhatsapp = WHATSAPP_LINK !== PLACEHOLDER_WHATSAPP_LINK

export type StatusUpdateEmailData = {
  requestNumber: string
  locale: Locale
  status: RequestStatus
  customerName: string
}

const COPY: Record<RequestStatus, { fr: { label: string; body: string }; en: { label: string; body: string } }> = {
  request_received: {
    fr: { label: 'Demande reçue', body: 'Nous avons bien reçu votre demande et allons l’examiner prochainement.' },
    en: { label: 'Request received', body: 'We\'ve received your request and will review it shortly.' },
  },
  on_treatment: {
    fr: {
      label: 'Demande en cours de traitement',
      body: 'Notre équipe recherche activement la ou les pièces demandées.',
    },
    en: { label: 'Request in progress', body: 'Our team is actively sourcing the requested part(s).' },
  },
  parts_found: {
    fr: {
      label: 'Pièces trouvées',
      body: 'Bonne nouvelle : nous avons trouvé la ou les pièces que vous recherchez. Nous allons vous contacter pour la suite.',
    },
    en: {
      label: 'Parts found',
      body: 'Good news: we\'ve found the part(s) you\'re looking for. We\'ll be in touch about next steps.',
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

export function buildStatusUpdateEmail(data: StatusUpdateEmailData): { subject: string; html: string } {
  return data.locale === 'en' ? buildEn(data) : buildFr(data)
}

function buildFr(data: StatusUpdateEmailData): { subject: string; html: string } {
  const copy = COPY[data.status].fr
  const subject = `${copy.label} — ${data.requestNumber}`

  const body = `
    ${renderParagraph(`Bonjour ${escapeHtml(data.customerName)},`)}
    ${renderInfoCard('Mise à jour de votre demande', [
      { label: 'N° de demande', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
      { label: 'Nouveau statut', value: escapeHtml(copy.label) },
    ])}
    ${renderParagraph(copy.body)}
    ${hasRealWhatsapp ? renderCta(WHATSAPP_LINK, 'Discuter sur WhatsApp') : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Nous contacter par e-mail')}
  `

  const html = renderEmailShell({
    preheader: `${copy.label} — demande ${data.requestNumber}`,
    title: subject,
    body,
    footer: `Dakar Auto — Pièces détachées automobiles.<br />Cet e-mail concerne votre demande ${escapeHtml(data.requestNumber)}.`,
  })

  return { subject, html }
}

function buildEn(data: StatusUpdateEmailData): { subject: string; html: string } {
  const copy = COPY[data.status].en
  const subject = `${copy.label} — ${data.requestNumber}`

  const body = `
    ${renderParagraph(`Hello ${escapeHtml(data.customerName)},`)}
    ${renderInfoCard('Request update', [
      { label: 'Request number', value: `<span style="font-family:monospace;">${escapeHtml(data.requestNumber)}</span>` },
      { label: 'New status', value: escapeHtml(copy.label) },
    ])}
    ${renderParagraph(copy.body)}
    ${hasRealWhatsapp ? renderCta(WHATSAPP_LINK, 'Chat on WhatsApp') : renderCta(`mailto:${EMAIL_ADDRESS}`, 'Contact us by email')}
  `

  const html = renderEmailShell({
    preheader: `${copy.label} — request ${data.requestNumber}`,
    title: subject,
    body,
    footer: `Dakar Auto — Automotive spare parts.<br />This email is about your request ${escapeHtml(data.requestNumber)}.`,
  })

  return { subject, html }
}
