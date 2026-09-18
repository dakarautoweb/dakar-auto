'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { trackLookupAction } from '@/src/services/tracking/actions'
import { buttonClasses, cardClasses, inputClass } from '@/src/components/ui/styles'
import { AlertCircleIcon, SearchIcon } from '@/src/components/home/icons'
import { TurnstileWidget, type TurnstileWidgetHandle } from '@/src/components/turnstile-widget'

type Status = 'idle' | 'submitting' | 'not_found' | 'rate_limited' | 'turnstile'

export function TrackLookupForm({ dict }: { dict: Dictionary }) {
  const t = dict.tracking.lookup
  const router = useRouter()
  const [requestNumber, setRequestNumber] = useState('')
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)

  const isValid = requestNumber.trim().length > 0 && contact.trim().length > 0 && turnstileToken.length > 0

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isValid || status === 'submitting') return

    setStatus('submitting')
    const result = await trackLookupAction(requestNumber, contact, turnstileToken)

    if (result.ok) {
      router.push(`/track/${result.token}`)
      return
    }
    setStatus(result.reason)
    // Any failed attempt — not found, rate limited, or a Turnstile failure
    // itself — must force a fresh challenge before the next try (item 8: a
    // token is never reused across attempts).
    setTurnstileToken('')
    turnstileRef.current?.reset()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={cardClasses({ tone: 'raised' })}>
      <div className="space-y-5">
        <div>
          <label htmlFor="track-request-number" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.requestNumberLabel}
          </label>
          <input
            id="track-request-number"
            value={requestNumber}
            onChange={(e) => {
              setRequestNumber(e.target.value)
              setStatus('idle')
            }}
            placeholder={t.requestNumberPlaceholder}
            autoComplete="off"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="track-contact" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.contactLabel}
          </label>
          <input
            id="track-contact"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value)
              setStatus('idle')
            }}
            placeholder={t.contactPlaceholder}
            autoComplete="off"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4">
        <TurnstileWidget dict={dict} ref={turnstileRef} onToken={setTurnstileToken} />
      </div>

      {(status === 'not_found' || status === 'rate_limited' || status === 'turnstile') && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-medium text-red-600 dark:text-red-400">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {status === 'rate_limited' ? t.rateLimited : status === 'turnstile' ? dict.turnstile.failed : t.notFound}
        </p>
      )}

      <button
        type="submit"
        disabled={!isValid || status === 'submitting'}
        className={buttonClasses({ variant: 'primary', fullWidth: true, className: 'mt-6 sm:w-auto' })}
      >
        <SearchIcon className="h-[18px] w-[18px]" />
        {status === 'submitting' ? t.submitting : t.submitCta}
      </button>
    </form>
  )
}
