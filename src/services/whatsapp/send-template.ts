import 'server-only'
import type { WhatsAppConfig, WhatsAppTemplateConfig } from './config'

const REQUEST_TIMEOUT_MS = 10_000

export type WhatsAppSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; reason: 'disabled' | 'invalid_recipient' | 'http_error' | 'timeout' | 'network_error'; status?: number }

// Meta rejects template text parameters that are empty or contain
// newlines/tabs or more than four consecutive spaces.
export function sanitizeTemplateText(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() || '—'
}

// Sends one approved template message with positional body parameters
// ({{1}}, {{2}}, ...). The message text itself lives in the Meta-approved
// template — nothing here is a free-form message body.
//
// Never throws and never logs; the caller logs the returned reason. The
// token, Authorization header and raw response body are never returned.
export async function sendWhatsAppTemplate({
  config,
  to,
  template,
  bodyParameters,
  headerImageUrl,
  urlButtonParameter,
}: {
  config: WhatsAppConfig
  to: string
  template: WhatsAppTemplateConfig
  bodyParameters: string[]
  headerImageUrl?: string
  urlButtonParameter?: string
}): Promise<WhatsAppSendResult> {
  const url = `https://graph.facebook.com/${encodeURIComponent(config.graphApiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`
  const components: Record<string, unknown>[] = []

  if (headerImageUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: headerImageUrl } }],
    })
  }

  if (bodyParameters.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParameters.map((text) => ({ type: 'text', text: sanitizeTemplateText(text) })),
    })
  }

  if (urlButtonParameter) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: sanitizeTemplateText(urlButtonParameter) }],
    })
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components,
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })

    if (!response.ok) {
      return { ok: false, reason: 'http_error', status: response.status }
    }

    const body = (await response.json().catch(() => null)) as { messages?: { id?: unknown }[] } | null
    const messageId = body?.messages?.[0]?.id
    return { ok: true, messageId: typeof messageId === 'string' ? messageId : null }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    return { ok: false, reason: isTimeout ? 'timeout' : 'network_error' }
  }
}
