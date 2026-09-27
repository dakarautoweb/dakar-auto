import 'server-only'

export const DEFAULT_CHAT_MODEL = 'gpt-6-sol'

// Whole-turn budget, tool round trips included. No automatic retries — the
// widget offers a manual retry instead of silently paying for a second call.
export const CHAT_TIMEOUT_MS = 20_000

export type ChatConfig = {
  apiKey: string
  model: string
}

// Read at request time, server-side only. Same OPENAI_API_KEY as photo
// recognition; the model is configured separately.
export function getChatConfig(): ChatConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  const model = process.env.OPENAI_CHAT_MODEL?.trim() || DEFAULT_CHAT_MODEL
  return { apiKey, model }
}

export function isChatAssistantConfigured(): boolean {
  return getChatConfig() !== null
}
