'use client'

import { useRef, useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { ChatMessage } from '@/src/lib/chat/types'
import { postRecovery } from '@/src/lib/chat/client'
import { parseLastName, parseRecoveryContact } from '@/src/lib/request-recovery/normalize'
import type { RecoveredRequest, RecoveryApiResponse, RecoveryDiscriminator } from '@/src/lib/request-recovery/types'

export type RecoveryStep = 'contact' | 'name' | 'discriminator' | 'code' | 'select' | 'failed'

export type RecoveryState = {
  step: RecoveryStep
  discriminator: 'kind' | 'period' | null
  busy: boolean
  inputError: string | null
  resendAvailableAt: number
  // Only after verification: the customer's matching requests to pick from.
  requests?: RecoveredRequest[]
}

type PushMessage = (...entries: Omit<ChatMessage, 'id'>[]) => void

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}

// Deterministic, application-controlled lost-request flow. Everything the
// customer types here stays in this hook's own state and in messages
// tagged channel: 'recovery', which buildAiHistory() never sends to the AI.
// The contact and name are kept in a ref (not rendered state) and dropped
// as soon as the flow ends.
export function useRequestRecovery({
  dict,
  locale,
  enabled,
  push,
  onFinished,
}: {
  dict: Dictionary['chatWidget']
  locale: string
  enabled: boolean
  push: PushMessage
  onFinished: () => void
}) {
  const t = dict.recovery
  const [state, setState] = useState<RecoveryState | null>(null)
  const secrets = useRef<{ contact: string; lastName: string; challengeId: string | null }>({ contact: '', lastName: '', challengeId: null })

  const say = (content: string, extra: Partial<ChatMessage> = {}) => push({ role: 'assistant', content, channel: 'recovery', ...extra })
  const echo = (content: string) => push({ role: 'user', content, channel: 'recovery' })

  function reset() {
    secrets.current = { contact: '', lastName: '', challengeId: null }
  }

  function fail(message: string) {
    reset()
    say(message)
    setState({ step: 'failed', discriminator: null, busy: false, inputError: null, resendAvailableAt: 0 })
  }

  function start() {
    reset()
    if (!enabled) {
      say(t.unavailable, { action: { type: 'contact' } })
      onFinished()
      return
    }
    say(t.start)
    say(t.askContact)
    setState({ step: 'contact', discriminator: null, busy: false, inputError: null, resendAvailableAt: 0 })
  }

  function cancel() {
    reset()
    say(t.cancelled)
    setState(null)
    onFinished()
  }

  // Leaves a finished/failed flow without adding anything to the thread.
  function exit() {
    reset()
    setState(null)
    onFinished()
  }

  function handleLookupResult(result: RecoveryApiResponse) {
    switch (result.status) {
      case 'need_discriminator':
        say(result.discriminator === 'kind' ? t.askKind : t.askPeriod)
        setState({ step: 'discriminator', discriminator: result.discriminator, busy: false, inputError: null, resendAvailableAt: 0 })
        return
      case 'code_sent':
        secrets.current.challengeId = result.challengeId
        say(fill(t.codeSent, { destination: result.destination }))
        say(t.askCode)
        setState({ step: 'code', discriminator: null, busy: false, inputError: null, resendAvailableAt: Date.now() + result.resendAfterSeconds * 1000 })
        return
      case 'rate_limited':
        return fail(t.rateLimited)
      case 'delivery_failed':
        return fail(t.deliveryFailed)
      case 'unavailable':
        return fail(t.unavailable)
      case 'needs_assistance':
        return fail(t.needsAssistance)
      default:
        return fail(t.notFound)
    }
  }

  async function lookup(discriminator: RecoveryDiscriminator | null) {
    setState((s) => s && { ...s, busy: true, inputError: null })
    const { contact, lastName } = secrets.current
    handleLookupResult(await postRecovery({ action: 'lookup', contact, lastName, discriminator, locale }))
  }

  function submitText(raw: string) {
    if (!state || state.busy) return
    const value = raw.trim()
    if (state.step === 'contact') {
      if (!parseRecoveryContact(value)) return setState({ ...state, inputError: t.invalidContact })
      secrets.current.contact = value
      echo(value)
      say(t.askName)
      setState({ ...state, step: 'name', inputError: null })
      return
    }
    if (state.step === 'name') {
      if (!parseLastName(value)) return setState({ ...state, inputError: t.invalidName })
      secrets.current.lastName = value
      echo(value)
      void lookup(null)
      return
    }
    if (state.step === 'code') {
      const code = value.replace(/\s/g, '')
      if (!/^\d{6}$/.test(code)) return setState({ ...state, inputError: t.askCode })
      // The code itself is never shown in the thread.
      echo(t.codeEntered)
      void verify(code)
    }
  }

  function chooseDiscriminator(discriminator: RecoveryDiscriminator, label: string) {
    if (!state || state.busy) return
    echo(label)
    void lookup(discriminator)
  }

  function showRequest(request: RecoveredRequest) {
    const lines = [t.found, request.requestNumber, request.vehicleLabel, fill(t.statusLine, { status: request.statusLabel })].filter(Boolean)
    say(lines.join('\n'), { action: { type: 'link', href: request.trackingPath }, actionLabel: t.viewRequest })
    reset()
    setState(null)
    // Only this generic line joins the normal conversation.
    push({ role: 'assistant', content: t.completed })
    onFinished()
  }

  function chooseRequest(request: RecoveredRequest, label: string) {
    if (state?.step !== 'select') return
    echo(label)
    showRequest(request)
  }

  async function verify(code: string) {
    const challengeId = secrets.current.challengeId
    if (!challengeId) return fail(t.expired)
    setState((s) => s && { ...s, busy: true, inputError: null })
    const result = await postRecovery({ action: 'verify', challengeId, code, locale })
    switch (result.status) {
      case 'verified':
        return showRequest(result.request)
      case 'verified_multiple':
        // Ownership is proven; the customer picks — nothing is guessed.
        reset()
        say(t.chooseRequest)
        setState({ step: 'select', discriminator: null, busy: false, inputError: null, resendAvailableAt: 0, requests: result.requests })
        return
      case 'invalid_code':
        say(fill(t.invalidCode, { remaining: result.attemptsLeft }))
        setState((s) => s && { ...s, busy: false })
        return
      case 'locked':
        return fail(t.locked)
      case 'rate_limited':
        return fail(t.rateLimited)
      case 'unavailable':
        return fail(t.unavailable)
      default:
        return fail(t.expired)
    }
  }

  async function resend() {
    const challengeId = secrets.current.challengeId
    if (!state || state.busy || !challengeId) return
    setState({ ...state, busy: true, inputError: null })
    const result = await postRecovery({ action: 'resend', challengeId, locale })
    switch (result.status) {
      case 'code_sent':
        say(fill(t.codeResent, { destination: result.destination }))
        setState((s) => s && { ...s, busy: false, resendAvailableAt: Date.now() + result.resendAfterSeconds * 1000 })
        return
      case 'cooldown':
        setState((s) => s && { ...s, busy: false, resendAvailableAt: Date.now() + result.retryAfterSeconds * 1000 })
        return
      case 'rate_limited':
        say(t.rateLimited)
        setState((s) => s && { ...s, busy: false, resendAvailableAt: Number.MAX_SAFE_INTEGER })
        return
      case 'delivery_failed':
        say(t.deliveryFailed)
        setState((s) => s && { ...s, busy: false })
        return
      default:
        return fail(t.expired)
    }
  }

  return { state, start, cancel, exit, submitText, chooseDiscriminator, chooseRequest, resend }
}
