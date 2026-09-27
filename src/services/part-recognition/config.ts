import 'server-only'

export const DEFAULT_PART_RECOGNITION_MODEL = 'gpt-6-astra'

// One attempt, no automatic retries (a retry is a second billed call) —
// the customer gets a manual "retry" button instead.
export const PART_RECOGNITION_TIMEOUT_MS = 20_000

export type PartRecognitionConfig = {
  apiKey: string
  model: string
}

// Read at request time, server-side only. Returns null when the feature
// isn't configured so the endpoint can answer `not_configured` instead of
// throwing — the rest of the site never depends on this.
export function getPartRecognitionConfig(): PartRecognitionConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null
  const model = process.env.OPENAI_PART_RECOGNITION_MODEL?.trim() || DEFAULT_PART_RECOGNITION_MODEL
  return { apiKey, model }
}
