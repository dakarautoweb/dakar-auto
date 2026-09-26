import 'server-only'
import type { Locale } from '@/src/i18n/config'
import { getWhatsAppConfig, type WhatsAppTemplateSet } from './config'
import { normalizeWhatsAppRecipient } from './phone'
import { sendWhatsAppTemplate, type WhatsAppSendResult } from './send-template'

// Shared flow behind every customer confirmation over WhatsApp (parts and
// vehicle requests): config check → recipient normalization → template send
// → one-line log on failure. Best-effort and never throws — missing
// configuration or an unusable number is a logged no-op.
export async function sendWhatsAppCustomerConfirmation({
  templateSet,
  requestNumber,
  locale,
  whatsappPhone,
  bodyParameters,
}: {
  templateSet: WhatsAppTemplateSet
  requestNumber: string
  locale: Locale
  whatsappPhone: string | null
  bodyParameters: string[]
}): Promise<WhatsAppSendResult> {
  const configResult = getWhatsAppConfig(templateSet)
  if (!configResult.ok) {
    console.error(`[whatsapp] Not configured (missing ${configResult.missing.join(', ')}) — skipping customer confirmation`)
    return { ok: false, reason: 'disabled' }
  }

  const to = normalizeWhatsAppRecipient(whatsappPhone)
  if (!to) {
    console.error('[whatsapp] Customer confirmation skipped: no valid international WhatsApp number')
    return { ok: false, reason: 'invalid_recipient' }
  }

  const { config } = configResult
  const result = await sendWhatsAppTemplate({
    config,
    to,
    template: config.templates[locale],
    bodyParameters,
  })
  if (!result.ok) {
    const detail =
      result.reason === 'http_error'
        ? `Meta API returned ${result.status}`
        : result.reason === 'timeout'
          ? 'request timed out'
          : 'network error'
    console.error(`[whatsapp] Customer confirmation failed for ${requestNumber}: ${detail}`)
  }
  return result
}
