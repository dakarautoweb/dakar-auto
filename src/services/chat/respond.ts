import 'server-only'
import OpenAI from 'openai'
import type { Locale } from '@/src/i18n/config'
import { redactPii } from '@/src/lib/chat/redact'
import { resolveActionHref } from '@/src/lib/chat/routes'
import { ASSISTANT_INTENTS, type AssistantAction, type AssistantIntent, type AssistantReply, type ChatErrorCode, type ChatHistoryEntry } from '@/src/lib/chat/types'
import type { PublicVehicleSummary } from '@/src/services/inventory/types'
import { CHAT_TIMEOUT_MS, getChatConfig } from './config'
import { buildChatInstructions } from './instructions'
import { ASSISTANT_REPLY_JSON_SCHEMA, ASSISTANT_REPLY_SCHEMA_NAME } from './schema'
import { CHAT_TOOLS, runVehicleSearch, SEARCH_PUBLIC_VEHICLES } from './tools'

export type GenerateReplyInput = {
  history: ChatHistoryEntry[]
  locale: Locale
  pathname: string | null
  knowledge: string
  loadVehicles: () => Promise<PublicVehicleSummary[]>
  // The incoming request's signal — a customer closing the widget cancels
  // the provider call too.
  signal?: AbortSignal
}

export type GenerateReplyOutcome = { ok: true; reply: AssistantReply } | { ok: false; error: ChatErrorCode }

// Tool round trips before a final answer is required.
const MAX_TOOL_ROUNDS = 2
const MAX_REPLY_CHARS = 1200
const MAX_OUTPUT_TOKENS = 2000

// Error class names and HTTP status only — never the provider's message,
// the conversation, headers or key.
function logFailure(reason: string, error?: unknown) {
  const detail =
    error instanceof OpenAI.APIError
      ? ` (${error.constructor.name}${error.status ? ` ${error.status}` : ''})`
      : error instanceof Error
        ? ` (${error.name})`
        : ''
  console.error(`[chat] ${reason}${detail}`)
}

// What the model may send: the customer's words with obvious identifiers
// (email, phone, VIN, tracking token) replaced by placeholders.
export function toProviderInput(history: ChatHistoryEntry[]): OpenAI.Responses.ResponseInputItem[] {
  return history.map((entry) => ({ role: entry.role, content: redactPii(entry.content) }))
}

export function validateAssistantReply(raw: unknown, allowedVehicleIds: ReadonlySet<string>): AssistantReply | null {
  if (!raw || typeof raw !== 'object') return null
  const { message, intent, action } = raw as Record<string, unknown>
  if (typeof message !== 'string' || !message.trim()) return null

  const safeIntent: AssistantIntent = (ASSISTANT_INTENTS as readonly string[]).includes(intent as string) ? (intent as AssistantIntent) : 'general'
  const text = message.trim()

  let safeAction: AssistantAction | null = null
  const type = action && typeof action === 'object' ? (action as Record<string, unknown>).type : null
  if (type === 'link') {
    const href = resolveActionHref((action as Record<string, unknown>).href, allowedVehicleIds)
    safeAction = href ? { type: 'link', href } : null
  } else if (type === 'contact' || type === 'faq' || type === 'start_recovery') {
    safeAction = { type }
  }
  // A lost request always goes through the secure flow, whatever the model
  // picked as the button.
  if (safeIntent === 'lost_request') safeAction = { type: 'start_recovery' }

  return {
    message: text.length > MAX_REPLY_CHARS ? `${text.slice(0, MAX_REPLY_CHARS - 1)}…` : text,
    intent: safeIntent,
    action: safeAction,
  }
}

export async function generateAssistantReply(input: GenerateReplyInput): Promise<GenerateReplyOutcome> {
  const config = getChatConfig()
  if (!config) {
    console.error('[chat] Not configured: OPENAI_API_KEY is missing')
    return { ok: false, error: 'not_configured' }
  }

  const client = new OpenAI({ apiKey: config.apiKey, timeout: CHAT_TIMEOUT_MS, maxRetries: 0 })
  const deadline = AbortSignal.timeout(CHAT_TIMEOUT_MS)
  const signal = input.signal ? AbortSignal.any([input.signal, deadline]) : deadline

  const instructions = buildChatInstructions({ locale: input.locale, pathname: input.pathname, knowledge: input.knowledge })
  const conversation: OpenAI.Responses.ResponseInputItem[] = toProviderInput(input.history)
  const allowedVehicleIds = new Set<string>()

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    let response: OpenAI.Responses.Response
    try {
      response = await client.responses.create(
        {
          model: config.model,
          instructions,
          input: conversation,
          // No web search, no hosted tools — only the inventory search, and
          // no tool call allowed on the last round so the model must answer.
          tools: CHAT_TOOLS,
          tool_choice: round < MAX_TOOL_ROUNDS ? 'auto' : 'none',
          text: {
            format: { type: 'json_schema', name: ASSISTANT_REPLY_SCHEMA_NAME, schema: ASSISTANT_REPLY_JSON_SCHEMA, strict: true },
          },
          max_output_tokens: MAX_OUTPUT_TOKENS,
          store: false,
          // Reasoning items must be passed back on tool rounds with store: false.
          include: ['reasoning.encrypted_content'],
        },
        { signal },
      )
    } catch (error) {
      if (input.signal?.aborted) return { ok: false, error: 'aborted' }
      if (deadline.aborted || error instanceof OpenAI.APIConnectionTimeoutError) {
        logFailure('OpenAI request timed out', error)
        return { ok: false, error: 'timeout' }
      }
      if (error instanceof OpenAI.RateLimitError) {
        logFailure('OpenAI rate limit reached', error)
        return { ok: false, error: 'rate_limited' }
      }
      logFailure('OpenAI request failed', error)
      return { ok: false, error: 'provider_error' }
    }

    const calls = response.output.filter((item): item is OpenAI.Responses.ResponseFunctionToolCall => item.type === 'function_call')
    if (calls.length > 0) {
      conversation.push(...(response.output as OpenAI.Responses.ResponseInputItem[]))
      for (const call of calls) {
        let output: unknown = { error: 'unknown_tool' }
        if (call.name === SEARCH_PUBLIC_VEHICLES) {
          try {
            const result = await runVehicleSearch(call.arguments, input.loadVehicles)
            result.vehicles.forEach((v) => allowedVehicleIds.add(v.id))
            output = result
          } catch {
            logFailure('Vehicle search failed')
            output = { error: 'search_unavailable' }
          }
        }
        conversation.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(output) })
      }
      continue
    }

    if (response.status !== 'completed') {
      logFailure(`OpenAI response not completed: ${response.status ?? 'unknown'}`)
      return { ok: false, error: 'invalid_result' }
    }
    const refused = response.output.some((item) => item.type === 'message' && item.content.some((c) => c.type === 'refusal'))
    if (refused) {
      logFailure('OpenAI refused the request')
      return { ok: false, error: 'invalid_result' }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(response.output_text)
    } catch {
      logFailure('OpenAI returned unparseable output')
      return { ok: false, error: 'invalid_result' }
    }
    const reply = validateAssistantReply(parsed, allowedVehicleIds)
    if (!reply) {
      logFailure('OpenAI returned an invalid reply')
      return { ok: false, error: 'invalid_result' }
    }
    return { ok: true, reply }
  }

  logFailure('OpenAI kept calling tools without answering')
  return { ok: false, error: 'invalid_result' }
}
