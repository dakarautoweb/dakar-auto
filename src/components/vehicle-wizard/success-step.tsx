import Link from 'next/link'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { WHATSAPP_LINK, EMAIL_ADDRESS } from '@/src/lib/contact-info'
import { CheckCircleIcon } from '@/src/components/home/icons'

export function SuccessStep({ dict, requestNumber }: { dict: Dictionary; requestNumber: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-surface/60 p-8 text-center shadow-md sm:p-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
        <CheckCircleIcon className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-bold tracking-tight">{dict.wizard.success.title}</h2>
      <p className="mt-2 max-w-md text-muted-foreground">{dict.wizard.success.description}</p>

      <div className="mt-6 rounded-xl border border-border bg-background px-5 py-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {dict.wizard.success.requestNumberLabel}
        </p>
        <p className="mt-0.5 font-mono text-lg font-semibold">{requestNumber}</p>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
        >
          {dict.wizard.success.whatsappCta}
        </a>
        <a
          href={`mailto:${EMAIL_ADDRESS}`}
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
        >
          {dict.wizard.success.emailCta}
        </a>
      </div>

      <Link href="/" className="mt-8 text-sm font-medium text-accent hover:underline">
        {dict.wizard.success.backHome}
      </Link>
    </div>
  )
}
