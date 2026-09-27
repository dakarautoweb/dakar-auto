import { handleRecoveryRequest } from '@/src/services/request-recovery/handle-request'

// Secure "lost request" recovery used by the chat widget. Deterministic
// application logic only — this endpoint never calls the AI provider (see
// src/services/request-recovery/flow.ts).
export const maxDuration = 20

export async function POST(request: Request) {
  return handleRecoveryRequest(request)
}
