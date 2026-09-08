'use client'

import { useEffect } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { CameraIcon } from '@/src/components/home/icons'

export function ScanVinModal({
  dict,
  onClose,
  onManual,
}: {
  dict: Dictionary
  onClose: () => void
  onManual: () => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={dict.wizard.scanModal.title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CameraIcon className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-center text-lg font-semibold">{dict.wizard.scanModal.title}</h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">{dict.wizard.scanModal.description}</p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onManual}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            {dict.wizard.scanModal.manualCta}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            {dict.wizard.scanModal.close}
          </button>
        </div>
      </div>
    </div>
  )
}
