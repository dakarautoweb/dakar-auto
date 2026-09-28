// Pure types — the /api/chat/recovery contract, shared by the widget and
// the server. None of this ever goes to the AI endpoint.

export type RecoveryRequestKind = 'parts' | 'vehicle'

// Fixed options, identical for every customer, so the buttons themselves
// reveal nothing about which requests exist.
export const RECOVERY_PERIODS = ['week', 'month', 'quarter', 'older'] as const
export type RecoveryPeriod = (typeof RECOVERY_PERIODS)[number]

export type RecoveryDiscriminator = { type: 'kind'; value: RecoveryRequestKind } | { type: 'period'; value: RecoveryPeriod }

export type RecoveryApiRequest =
  // Sent when the flow starts: the endpoint checks its own runtime
  // configuration (and logs why, if it's broken) before the customer types anything.
  | { action: 'status'; locale: string }
  | { action: 'lookup'; contact: string; lastName: string; discriminator?: RecoveryDiscriminator | null; locale: string }
  | { action: 'verify'; challengeId: string; code: string; locale: string }
  | { action: 'resend'; challengeId: string; locale: string }

export type RecoveredRequest = {
  requestNumber: string
  kind: RecoveryRequestKind
  vehicleLabel: string | null
  statusLabel: string
  // ISO submission timestamp — like everything here, only after verification.
  createdAt: string
  // /track/<tracking_token> — the existing public tracking page.
  trackingPath: string
}

export type RecoveryApiResponse =
  | { status: 'ready' }
  | { status: 'need_discriminator'; discriminator: 'kind' | 'period' }
  | { status: 'code_sent'; challengeId: string; destination: string; resendAfterSeconds: number }
  | { status: 'verified'; request: RecoveredRequest }
  // Several requests share the verified email: the customer picks one.
  | { status: 'verified_multiple'; requests: RecoveredRequest[] }
  | { status: 'invalid_code'; attemptsLeft: number }
  | { status: 'cooldown'; retryAfterSeconds: number }
  | { status: 'invalid_input' | 'not_found' | 'expired' | 'locked' | 'rate_limited' | 'delivery_failed' | 'unavailable' | 'needs_assistance' }
