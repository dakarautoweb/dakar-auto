import 'server-only'
import { resendClient } from '@/src/services/email/config'

type Env = Record<string, string | undefined>

// HMAC key for stored verification-code hashes. Required — without it (or
// without Resend to deliver the code) the flow reports itself unavailable
// rather than falling back to a weaker scheme.
export const MIN_RECOVERY_SECRET_LENGTH = 32

export function getRecoverySecret(env: Env = process.env): string | null {
  const secret = env.REQUEST_RECOVERY_SECRET?.trim()
  return secret && secret.length >= MIN_RECOVERY_SECRET_LENGTH ? secret : null
}

// Presence/shape flags only — safe to log. Never the values themselves.
export type RecoveryConfigDiagnostics = {
  recoverySecretPresent: boolean
  recoverySecretLengthValid: boolean
  // e.g. `"abc…"` pasted with its quotes. Still usable as a key, but a sign
  // the value isn't the one that was intended.
  recoverySecretQuoted: boolean
  resendApiKeyPresent: boolean
  resendClientConfigured: boolean
  resendFromUsesFallback: boolean
  supabaseUrlPresent: boolean
  serviceRolePresent: boolean
}

export type RecoveryConfigProblem =
  | 'recovery_secret_missing'
  | 'recovery_secret_too_short'
  | 'resend_api_key_missing'
  | 'resend_client_missing'
  | 'supabase_url_missing'
  | 'service_role_missing'

export type RecoveryConfigStatus =
  | { ok: true; secret: string; diagnostics: RecoveryConfigDiagnostics }
  | { ok: false; problems: RecoveryConfigProblem[]; diagnostics: RecoveryConfigDiagnostics }

function present(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

export function diagnoseRecoveryConfig(
  env: Env = process.env,
  resendClientConfigured: boolean = resendClient !== null,
): RecoveryConfigDiagnostics {
  const secret = env.REQUEST_RECOVERY_SECRET?.trim() ?? ''
  return {
    recoverySecretPresent: secret.length > 0,
    recoverySecretLengthValid: secret.length >= MIN_RECOVERY_SECRET_LENGTH,
    recoverySecretQuoted: /^(["'])[\s\S]*\1$/.test(secret),
    resendApiKeyPresent: present(env.RESEND_API_KEY),
    resendClientConfigured,
    resendFromUsesFallback: !present(env.RESEND_FROM_EMAIL),
    supabaseUrlPresent: present(env.NEXT_PUBLIC_SUPABASE_URL),
    serviceRolePresent: present(env.SUPABASE_SERVICE_ROLE_KEY),
  }
}

// The runtime source of truth, checked by /api/chat/recovery on every call.
// Anything missing keeps the flow closed; `problems` says exactly why so the
// endpoint can log it (the client only ever sees "unavailable").
export function getRecoveryConfigStatus(
  env: Env = process.env,
  resendClientConfigured: boolean = resendClient !== null,
): RecoveryConfigStatus {
  const diagnostics = diagnoseRecoveryConfig(env, resendClientConfigured)
  const problems: RecoveryConfigProblem[] = []
  if (!diagnostics.recoverySecretPresent) problems.push('recovery_secret_missing')
  else if (!diagnostics.recoverySecretLengthValid) problems.push('recovery_secret_too_short')
  if (!diagnostics.resendApiKeyPresent) problems.push('resend_api_key_missing')
  else if (!diagnostics.resendClientConfigured) problems.push('resend_client_missing')
  if (!diagnostics.supabaseUrlPresent) problems.push('supabase_url_missing')
  if (!diagnostics.serviceRolePresent) problems.push('service_role_missing')

  const secret = getRecoverySecret(env)
  if (problems.length > 0 || !secret) return { ok: false, problems, diagnostics }
  return { ok: true, secret, diagnostics }
}

export function isRecoveryConfigured(): boolean {
  return getRecoveryConfigStatus().ok
}
