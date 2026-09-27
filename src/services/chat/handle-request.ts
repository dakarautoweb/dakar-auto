import 'server-only'
import { getDictionary } from '@/src/i18n/dictionaries'
import type { ChatApiResponse, ChatErrorCode } from '@/src/lib/chat/types'
import { getPublicFaqItems } from '@/src/services/faq/queries'
import { getPublicVehicles } from '@/src/services/inventory/queries'
import { clientKeyFromRequest, createMemoryRateLimiter } from '@/src/services/rate-limit/memory-rate-limiter'
import { getPublicSiteSettings } from '@/src/services/site-settings/queries'
import { getChatConfig } from './config'
import { isLostRequestMessage } from './intent'
import { buildKnowledge } from './knowledge'
import { generateAssistantReply } from './respond'
import { MAX_CHAT_BODY_BYTES, parseChatRequest } from './validate'

export const CHAT_ERROR_HTTP_STATUS: Record<ChatErrorCode, number> = {
  invalid_request: 400,
  not_configured: 503,
  too_many_requests: 429,
  timeout: 504,
  rate_limited: 503,
  provider_error: 502,
  invalid_result: 502,
  aborted: 499,
}

// Per-client limits for this public, paid endpoint. Process-local only —
// see memory-rate-limiter.ts for why this is not production-grade on its own.
const burstLimiter = createMemoryRateLimiter({ windowMs: 60_000, max: 10 })
const hourlyLimiter = createMemoryRateLimiter({ windowMs: 60 * 60_000, max: 80 })

function reply(body: ChatApiResponse): Response {
  return Response.json(body, { status: body.ok ? 200 : CHAT_ERROR_HTTP_STATUS[body.error], headers: { 'Cache-Control': 'no-store' } })
}

export async function handleChatRequest(request: Request): Promise<Response> {
  if (!getChatConfig()) {
    console.error('[chat] Not configured: OPENAI_API_KEY is missing')
    return reply({ ok: false, error: 'not_configured' })
  }

  const clientKey = clientKeyFromRequest(request)
  if (burstLimiter.isLimited(clientKey) || hourlyLimiter.isLimited(clientKey)) return reply({ ok: false, error: 'too_many_requests' })

  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CHAT_BODY_BYTES) return reply({ ok: false, error: 'invalid_request' })

  let body: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_CHAT_BODY_BYTES) return reply({ ok: false, error: 'invalid_request' })
    body = JSON.parse(text)
  } catch {
    return reply({ ok: false, error: 'invalid_request' })
  }

  const parsed = parseChatRequest(body)
  if (!parsed) return reply({ ok: false, error: 'invalid_request' })

  const dict = await getDictionary(parsed.locale)

  // Deterministic shortcut: a clear "I lost my request" message goes to the
  // secure recovery flow without any AI call.
  const latest = parsed.history[parsed.history.length - 1].content
  if (isLostRequestMessage(latest)) {
    return reply({ ok: true, reply: { message: dict.chatWidget.lostRequestReply, intent: 'lost_request', action: { type: 'start_recovery' } } })
  }

  const [faqItems, settings] = await Promise.all([getPublicFaqItems(parsed.locale), getPublicSiteSettings()])
  const outcome = await generateAssistantReply({
    history: parsed.history,
    locale: parsed.locale,
    pathname: parsed.pathname,
    knowledge: buildKnowledge({ dict, faqItems, settings }),
    loadVehicles: () => getPublicVehicles(),
    signal: request.signal,
  })
  return reply(outcome.ok ? { ok: true, reply: outcome.reply } : { ok: false, error: outcome.error })
}
