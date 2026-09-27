import { handleChatRequest } from '@/src/services/chat/handle-request'

// Dakar Auto Assistant (chat widget free-text questions), via the OpenAI
// Responses API — see src/services/chat/. Nothing is stored: the
// conversation lives in the visitor's browser only.
//
// Leaves headroom above the 20s whole-turn budget.
export const maxDuration = 30

export async function POST(request: Request) {
  return handleChatRequest(request)
}
