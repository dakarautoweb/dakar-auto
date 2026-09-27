import 'server-only'
import type { RecoveryContact } from '@/src/lib/request-recovery/normalize'
import type { RecoveryRequestKind } from '@/src/lib/request-recovery/types'

// Server-only shapes. A candidate carries the private contact fields needed
// for exact matching — it never leaves the server and never reaches the AI.
export type RecoveryCandidate = {
  kind: RecoveryRequestKind
  requestId: string
  createdAt: string
  customerName: string | null
  email: string | null
  phones: string[]
}

export type RecoveryRequestRef = { kind: RecoveryRequestKind; id: string }

// One challenge can cover several requests: when contact + name (+ the one
// discriminator) still leave more than one match and they all share the same
// email, ownership of that email is verified once and the customer then
// picks their request from the verified list. `requests` is never empty.
export type RecoveryChallenge = {
  id: string
  requests: RecoveryRequestRef[]
  codeHash: string
  attempts: number
  sendCount: number
  lastSentAt: string
  expiresAt: string
  consumedAt: string | null
}

export type RecoveredRequestRecord = {
  requestNumber: string
  kind: RecoveryRequestKind
  status: string
  trackingToken: string
  vehicleLabel: string | null
  createdAt: string
}

export interface RecoveryRepository {
  // Rows whose email/phone *may* match — the caller does the exact
  // normalized comparison. Bounded; never the whole table.
  findCandidates(contact: RecoveryContact): Promise<RecoveryCandidate[]>
  // Challenges created since `sinceIso` that cover this request.
  countChallengesSince(ref: RecoveryRequestRef, sinceIso: string): Promise<number>
  createChallenge(challenge: RecoveryChallenge): Promise<void>
  getChallenge(id: string): Promise<RecoveryChallenge | null>
  // Compare-and-set on `attempts` (and not consumed) so two concurrent
  // guesses can't both use the same attempt. Returns false if it lost.
  updateChallenge(id: string, expectedAttempts: number, patch: Partial<Pick<RecoveryChallenge, 'attempts' | 'codeHash' | 'sendCount' | 'lastSentAt' | 'expiresAt' | 'consumedAt'>>): Promise<boolean>
  getRequestEmail(kind: RecoveryRequestKind, requestId: string): Promise<string | null>
  getRecoveredRequest(kind: RecoveryRequestKind, requestId: string): Promise<RecoveredRequestRecord | null>
}
