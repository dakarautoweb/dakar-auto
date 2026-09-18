'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import { useSiteSettings } from '@/src/components/site-settings-context'
import { CheckCircleIcon, CopyIcon, ShieldIcon } from '@/src/components/home/icons'
import { buttonClasses, cardClasses, iconCircleClasses } from '@/src/components/ui/styles'
import type { AttachmentSummary } from './types'

export function SuccessStep({
  dict,
  requestNumber,
  trackingToken,
  attachmentSummary,
}: {
  dict: Dictionary
  requestNumber: string
  trackingToken: string
  attachmentSummary?: AttachmentSummary | null
}) {
  const t = dict.wizard.success
  const [copied, setCopied] = useState(false)
  const settings = useSiteSettings()

  const photosAttachedText =
    attachmentSummary && attachmentSummary.uploaded > 0
      ? attachmentSummary.uploaded === 1
        ? t.photosAttachedOne
        : t.photosAttachedOther.replace('{count}', String(attachmentSummary.uploaded))
      : null

  // Copies the exact string already rendered on screen — no reformatting,
  // no re-fetch, nothing that could drift from the backend-issued number.
  function handleCopy() {
    navigator.clipboard
      .writeText(requestNumber)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      })
      .catch(() => {})
  }

  return (
    <div className={cardClasses({ tone: 'raised', padding: 'lg', className: 'flex flex-col items-center text-center' })}>
      <div className={iconCircleClasses({ size: 'lg', tone: 'gold' })}>
        <CheckCircleIcon className="h-9 w-9" />
      </div>
      <h2 className="mt-5 text-3xl font-bold tracking-tight">{t.title}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{t.description}</p>

      <div className="mt-6 w-full max-w-xs rounded-2xl border border-accent/25 bg-surface p-5 shadow-card sm:max-w-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-left">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t.requestNumberLabel}</p>
            <p className="mt-1 font-mono text-base font-bold break-all sm:text-xl">{requestNumber}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t.copied : t.copyRequestNumber}
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              copied ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-card text-muted-foreground hover:border-accent-hover hover:text-accent-hover'
            }`}
          >
            {copied ? <CheckCircleIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied && t.copied}
          </button>
        </div>
      </div>

      <p className="mt-3 flex max-w-xs items-center justify-center gap-1.5 text-xs text-muted-foreground sm:max-w-sm">
        <ShieldIcon className="h-4 w-4 shrink-0 text-accent" />
        {t.saveNumberNote}
      </p>

      {photosAttachedText && <p className="mt-3 text-sm text-muted-foreground">{photosAttachedText}</p>}
      {attachmentSummary && attachmentSummary.failed > 0 && (
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">{t.photosPartialWarning}</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/track/${trackingToken}`} className={buttonClasses({ variant: 'primary', size: 'sm' })}>
          {t.trackCta}
        </Link>
        {settings.whatsapp && (
          <a href={buildWhatsAppLinkFrom(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            {t.whatsappCta}
          </a>
        )}
        {settings.email && (
          <a href={`mailto:${settings.email}`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
            {t.emailCta}
          </a>
        )}
      </div>

      <Link href="/" className="mt-8 text-sm font-medium text-accent transition duration-200 hover:underline">
        {t.backHome}
      </Link>
    </div>
  )
}
