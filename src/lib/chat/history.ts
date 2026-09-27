import type { ChatHistoryEntry, ChatMessage } from './types'

// Short memory: only the most recent turns go to the assistant.
export const MAX_HISTORY_MESSAGES = 10

// Builds what the widget sends to /api/chat. Excluded on purpose:
// - the static welcome bubble (not part of the conversation),
// - every message of the secure recovery flow (contact details, names,
//   verification codes and the recovered request itself),
// - failed turns (the error text, not a real assistant answer).
export function buildAiHistory(messages: ChatMessage[], max: number = MAX_HISTORY_MESSAGES): ChatHistoryEntry[] {
  return messages
    .filter((m) => m.id !== 'welcome' && m.channel !== 'recovery' && !m.failed && m.content.trim())
    .slice(-max)
    .map((m) => ({ role: m.role, content: m.content }))
}
