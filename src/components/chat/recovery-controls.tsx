'use client'

import { useEffect, useId, useState } from 'react'
import { ShieldIcon } from '@/src/components/ui/dakar-icons'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { RECOVERY_PERIODS, type RecoveredRequest, type RecoveryDiscriminator } from '@/src/lib/request-recovery/types'
import type { RecoveryState } from './use-request-recovery'

const chipClass =
  'min-h-11 rounded-xl border border-border px-3 py-2 text-left text-xs leading-snug font-medium text-foreground transition duration-200 hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 sm:min-h-9'
const linkButtonClass = 'inline-flex min-h-10 items-center text-xs font-semibold text-accent hover:text-accent-hover disabled:opacity-50 disabled:hover:text-accent sm:min-h-0'

function useSecondsUntil(timestamp: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    // Resync right away — `now` may date from an earlier step.
    const first = setTimeout(tick, 0)
    const timer = setInterval(tick, 1000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [timestamp])
  return Math.max(0, Math.ceil((timestamp - now) / 1000))
}

// The recovery flow's own input area — it replaces the AI composer while
// the flow is active, so nothing typed here can end up in an AI message.
export function RecoveryControls({
  dict,
  state,
  onSubmitText,
  onChoose,
  onChooseRequest,
  onResend,
  onCancel,
  onRestart,
  onContact,
  onExit,
  hasContact,
  locale,
}: {
  dict: Dictionary['chatWidget']
  state: RecoveryState
  onSubmitText: (value: string) => void
  onChoose: (discriminator: RecoveryDiscriminator, label: string) => void
  onChooseRequest: (request: RecoveredRequest, label: string) => void
  locale: string
  onResend: () => void
  onCancel: () => void
  onRestart: () => void
  onContact: () => void
  onExit: () => void
  hasContact: boolean
}) {
  const t = dict.recovery
  const inputId = useId()
  const errorId = useId()
  const [value, setValue] = useState('')
  const resendIn = useSecondsUntil(state.resendAvailableAt)

  if (state.step === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <button type="button" onClick={onRestart} className={chipClass}>
          {t.restart}
        </button>
        {hasContact && (
          <button type="button" onClick={onContact} className={chipClass}>
            {t.contactUs}
          </button>
        )}
        <button type="button" onClick={onExit} className={`${linkButtonClass} ml-auto`}>
          {dict.menu}
        </button>
      </div>
    )
  }

  if (state.step === 'select' && state.requests) {
    // Shown only after the code was verified, so request numbers are fine.
    const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
    return (
      <div className="space-y-1 px-4 py-3 sm:space-y-2">
        <div className="flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain">
          {state.requests.map((request) => {
            const title = [t.kinds[request.kind], request.vehicleLabel].filter(Boolean).join(' · ')
            const meta = `${request.requestNumber} · ${date.format(new Date(request.createdAt))}`
            return (
              <button key={request.trackingPath} type="button" onClick={() => onChooseRequest(request, `${title} — ${meta}`)} className={chipClass}>
                <span className="block">{title}</span>
                <span className="mt-0.5 block font-normal text-muted-foreground">{meta}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={onExit} className={linkButtonClass}>
          {dict.menu}
        </button>
      </div>
    )
  }

  if (state.step === 'discriminator') {
    const options: { discriminator: RecoveryDiscriminator; label: string }[] =
      state.discriminator === 'kind'
        ? [
            { discriminator: { type: 'kind', value: 'parts' }, label: t.kinds.parts },
            { discriminator: { type: 'kind', value: 'vehicle' }, label: t.kinds.vehicle },
          ]
        : RECOVERY_PERIODS.map((period) => ({ discriminator: { type: 'period', value: period }, label: t.periods[period] }))
    return (
      <div className="space-y-1 px-4 py-3 sm:space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => (
            <button key={option.label} type="button" disabled={state.busy} onClick={() => onChoose(option.discriminator, option.label)} className={chipClass}>
              {option.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} className={linkButtonClass}>
          {t.cancel}
        </button>
      </div>
    )
  }

  const field =
    state.step === 'contact'
      ? { label: t.contactLabel, placeholder: t.contactPlaceholder, autoComplete: 'off', inputMode: 'email' as const, maxLength: 254 }
      : state.step === 'name'
        ? { label: t.nameLabel, placeholder: t.namePlaceholder, autoComplete: 'family-name', inputMode: 'text' as const, maxLength: 80 }
        : { label: t.codeLabel, placeholder: t.codePlaceholder, autoComplete: 'one-time-code', inputMode: 'numeric' as const, maxLength: 7 }

  return (
    <form
      key={state.step}
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim() || state.busy) return
        onSubmitText(value)
        setValue('')
      }}
      className="space-y-1.5 px-4 py-3 sm:space-y-2"
    >
      <label htmlFor={inputId} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ShieldIcon className="h-3.5 w-3.5 text-accent" />
        {field.label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          inputMode={field.inputMode}
          maxLength={field.maxLength}
          autoFocus
          disabled={state.busy}
          aria-invalid={Boolean(state.inputError)}
          aria-describedby={state.inputError ? errorId : undefined}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-base text-foreground sm:h-10 sm:text-sm placeholder:text-muted-foreground focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state.busy || !value.trim()}
          className="h-11 shrink-0 rounded-xl bg-accent px-3.5 text-xs sm:h-10 font-semibold text-accent-foreground transition duration-200 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.busy ? t.searching : state.step === 'code' ? t.verify : t.submit}
        </button>
      </div>
      {state.inputError && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {state.inputError}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className={linkButtonClass}>
          {t.cancel}
        </button>
        {state.step === 'code' && (
          <button type="button" onClick={onResend} disabled={state.busy || resendIn > 0} className={linkButtonClass}>
            {resendIn > 0 && resendIn < 3600 ? t.resendIn.replace('{seconds}', String(resendIn)) : t.resend}
          </button>
        )}
      </div>
    </form>
  )
}
