import 'server-only'
import { escapeHtml } from '../layout'
import {
  resolveCategoryLabel,
  resolveConditionLabel,
  resolveCustomerConfirmationLabelFr,
  resolvePreferredContactLabel,
  resolveSideLabel,
} from '../labels'
import { SITE_URL, normalizePhoneDigits, buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import type { PartsRequestEmailData } from '../types'

// Dark graphite / orange-gold palette matching the site's dark theme (see
// app/globals.css, .dark block) — kept local to this file rather than
// folded into ../layout, since every other transactional email (customer
// confirmation, status updates, table reports) still uses the light shell
// from ../layout and must keep looking exactly as it does today.
const PAGE_BG = '#050506'
const HEADER_BG = '#0b0b0c'
const CARD_BG = '#1b1b1f'
const CARD_BG_SOFT = '#151517'
const BORDER = '#2a2a31'
const TEXT = '#f5f5f5'
const MUTED = '#c7c7d1' // kept deliberately light (not a thin gray) so it stays readable if a client force-inverts dark mode
const ORANGE = '#f97316'
const ORANGE_SOFT_BG = 'rgba(249,115,22,0.14)'
const ORANGE_SOFT_BORDER = 'rgba(249,115,22,0.4)'
const GOLD = '#d9a441'
const GOLD_SOFT_BG = 'rgba(217,164,65,0.12)'
const GOLD_SOFT_BORDER = 'rgba(217,164,65,0.35)'

// Absolute URL required — email clients can't resolve a relative /brand/...
// path. Built from the same SITE_URL every other outbound email link (e.g.
// the tracking URL) already uses, so it automatically becomes the real
// production origin once NEXT_PUBLIC_APP_URL is set on deploy; nothing
// hardcodes localhost.
const LOGO_URL = `${SITE_URL}/brand/dakar-auto-logo-header.png`

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

function link(href: string, text: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${ORANGE};text-decoration:none;font-weight:600;">${escapeHtml(text)}</a>`
}

function renderRow(label: string, value: string): string {
  return `
    <tr>
      <td width="34%" style="padding:11px 0;border-bottom:1px solid ${BORDER};font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};vertical-align:top;">${escapeHtml(label)}</td>
      <td width="66%" style="padding:11px 0 11px 14px;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT};font-weight:500;word-break:break-word;overflow-wrap:anywhere;vertical-align:top;">${value}</td>
    </tr>`
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
    renderRow('N° de demande', `<span style="font-family:'Courier New',monospace;color:${GOLD};">${escapeHtml(data.requestNumber)}</span>`),
    renderRow('Client', escapeHtml(data.contact.name)),
    renderRow('Téléphone', link(`tel:${normalizePhoneDigits(data.contact.phone)}`, data.contact.phone)),
    renderRow('E-mail', data.contact.email ? link(`mailto:${data.contact.email}`, data.contact.email) : 'Non renseigné'),
    renderRow('Contact préféré', escapeHtml(preferredContactLabel)),
    // Mirrors the routing in sendPartsRequestNotifications — the customer
    // gets an automatic confirmation only on their chosen channel.
    renderRow('Confirmation client', escapeHtml(resolveCustomerConfirmationLabelFr(data.contact.preferredContact))),
    ...(data.contact.whatsappPhone
      ? [renderRow('WhatsApp', link(buildWhatsAppLinkFrom(data.contact.whatsappPhone), data.contact.whatsappPhone))]
      : []),
    renderRow(
      'VIN',
      data.vehicle.vin ? `<span style="font-family:'Courier New',monospace;">${escapeHtml(data.vehicle.vin)}</span>` : 'Non renseigné'
    ),
    renderRow('Véhicule', escapeHtml(vehicleLine(data.vehicle))),
    renderRow('Pièce demandée', escapeHtml([categoryLabel, data.part.partName].filter(Boolean).join(' — '))),
    renderRow(
      'Détails',
      escapeHtml([sideLabel, conditionLabel, `Quantité : ${data.part.quantity}`].filter(Boolean).join(' · '))
    ),
    renderRow('Reçue le', escapeHtml(formatTimestamp(data.submittedAt))),
    ...(data.attachmentCount
      ? [
          renderRow(
            'Photos',
            `${data.attachmentCount} photo${data.attachmentCount > 1 ? 's' : ''} jointe${data.attachmentCount > 1 ? 's' : ''} à la demande`
          ),
        ]
      : []),
  ].join('')

  const descriptionCard = data.part.description
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;background:${CARD_BG_SOFT};border:1px solid ${BORDER};border-radius:12px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${GOLD};">Description fournie par le client</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT};word-break:break-word;">${escapeHtml(data.part.description).replace(/\n/g, '<br />')}</p>
          </td>
        </tr>
      </table>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${escapeHtml(subject)}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .dm-container { width: 100% !important; }
        .dm-px { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${PAGE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Nouvelle demande ${escapeHtml(data.requestNumber)} de ${escapeHtml(data.contact.name)}.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${PAGE_BG}" style="background:${PAGE_BG};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="dm-container" bgcolor="${HEADER_BG}" style="width:600px;max-width:600px;background:${HEADER_BG};border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
            <tr>
              <td class="dm-px" bgcolor="${HEADER_BG}" style="background:${HEADER_BG};padding:28px 32px 22px;text-align:center;">
                <img src="${LOGO_URL}" width="168" alt="Dakar Auto" style="display:block;margin:0 auto 18px;width:168px;max-width:168px;height:auto;border:0;outline:none;" />
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                  <tr><td height="3" width="64" bgcolor="${ORANGE}" style="background:${ORANGE};font-size:1px;line-height:3px;border-radius:2px;">&nbsp;</td></tr>
                </table>
                <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};">Nouvelle demande de pièces</p>
              </td>
            </tr>
            <tr>
              <td class="dm-px" bgcolor="${HEADER_BG}" style="background:${HEADER_BG};padding:6px 32px 32px;">
                <h1 style="margin:0 0 10px;font-size:21px;line-height:1.3;color:${TEXT};font-weight:700;">Nouvelle demande de pièces</h1>
                <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:${MUTED};">Une nouvelle demande vient d'être soumise sur Dakar Auto.</p>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="background:${ORANGE_SOFT_BG};border:1px solid ${ORANGE_SOFT_BORDER};border-radius:8px;padding:9px 16px;">
                      <span style="font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:${ORANGE};letter-spacing:0.02em;">${escapeHtml(data.requestNumber)}</span>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CARD_BG}" style="background:${CARD_BG};border:1px solid ${BORDER};border-radius:12px;">
                  <tr>
                    <td style="padding:18px 20px 4px;">
                      <p style="margin:0 0 4px;padding-bottom:10px;border-bottom:2px solid ${ORANGE};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${GOLD};">Détails de la demande</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
                    </td>
                  </tr>
                </table>

                ${descriptionCard}

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
                  <tr>
                    <td style="background:${GOLD_SOFT_BG};border:1px solid ${GOLD_SOFT_BORDER};border-radius:8px;padding:12px 16px;">
                      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">Statut</p>
                      <p style="margin:0;font-size:14px;font-weight:600;color:${TEXT};">Demande reçue</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="dm-px" bgcolor="${CARD_BG}" style="background:${CARD_BG};border-top:2px solid ${ORANGE};padding:22px 32px;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${TEXT};">Dakar Auto Web</p>
                <p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:${MUTED};">Notification interne</p>
                <p style="margin:0;font-size:11px;line-height:1.6;color:${MUTED};">Cette demande a été enregistrée dans le système Dakar Auto sous le numéro ${escapeHtml(data.requestNumber)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return { subject, html }
}
