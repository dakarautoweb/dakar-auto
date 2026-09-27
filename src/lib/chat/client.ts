import type { ChatApiResponse, ChatRequestBody } from './types'
import type { RecoveryApiRequest, RecoveryApiResponse } from '@/src/lib/request-recovery/types'

// Browser-side calls. Both endpoints are separate on purpose: /api/chat
// talks to the AI, /api/chat/recovery never does.

export async function postChatMessage(body: ChatRequestBody, signal?: AbortSignal): Promise<ChatApiResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    const json = (await response.json().catch(() => null)) as ChatApiResponse | null
    return json && typeof json === 'object' && 'ok' in json ? json : { ok: false, error: 'provider_error' }
  } catch {
    return { ok: false, error: signal?.aborted ? 'aborted' : 'provider_error' }
  }
}

export async function postRecovery(body: RecoveryApiRequest): Promise<RecoveryApiResponse> {
  try {
    const response = await fetch('/api/chat/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = (await response.json().catch(() => null)) as RecoveryApiResponse | null
    return json && typeof json === 'object' && 'status' in json ? json : { status: 'unavailable' }
  } catch {
    return { status: 'unavailable' }
  }
}
