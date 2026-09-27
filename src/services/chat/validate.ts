import 'server-only'
import { defaultLocale, isLocale, type Locale } from '@/src/i18n/config'
import { MAX_HISTORY_MESSAGES } from '@/src/lib/chat/history'
import { sanitizePathname } from '@/src/lib/chat/routes'
import type { ChatHistoryEntry } from '@/src/lib/chat/types'

export const MAX_USER_MESSAGE_CHARS = 1000
export const MAX_ASSISTANT_MESSAGE_CHARS = 2000
// More than this is not a real widget conversation — rejected outright
// rather than silently trimmed.
const MAX_RAW_MESSAGES = 50
export const MAX_CHAT_BODY_BYTES = 64 * 1024

export type ParsedChatRequest = {
  history: ChatHistoryEntry[]
  locale: Locale
  pathname: string | null
}

export function parseChatRequest(body: unknown): ParsedChatRequest | null {
  if (!body || typeof body !== 'object') return null
  const { messages, locale, pathname } = body as Record<string, unknown>
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_RAW_MESSAGES) return null

  const history: ChatHistoryEntry[] = []
  for (const entry of messages) {
    if (!entry || typeof entry !== 'object') return null
    const { role, content } = entry as Record<string, unknown>
    // Only the two conversation roles — a client can't inject "system" or
    // "developer" turns.
    if (role !== 'user' && role !== 'assistant') return null
    if (typeof content !== 'string') return null
    const text = content.trim()
    if (!text) return null
    if (text.length > (role === 'user' ? MAX_USER_MESSAGE_CHARS : MAX_ASSISTANT_MESSAGE_CHARS)) return null
    history.push({ role, content: text })
  }
  if (history[history.length - 1].role !== 'user') return null

  return {
    history: history.slice(-MAX_HISTORY_MESSAGES),
    locale: typeof locale === 'string' && isLocale(locale) ? locale : defaultLocale,
    pathname: sanitizePathname(pathname),
  }
}
