'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { CameraIcon, CheckCircleIcon, ImageIcon, UploadIcon, XIcon } from '@/src/components/home/icons'
import { buttonClasses } from '@/src/components/ui/styles'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import type { PartRecognitionResult } from '@/src/lib/part-recognition/types'

const ACCEPT = ALLOWED_MIME_TYPES.join(',')

// Entry point for future AI part recognition (see category-step.tsx for
// where this opens from). Today it only lets the customer pick a photo,
// validates it client-side, and shows a "ready, but not analyzed yet"
// state — no image ever leaves the browser and no AI service is called.
//
// `result`/`RecognitionResult` below exist purely so the eventual response
// from a real recognition API (see PartRecognitionResult) has a UI ready
// to render into. `result` is hard-coded to never become non-null, so that
// section stays dead code until a future change wires up an actual API
// call and calls `setResult(...)`.
export function IdentifyPhotoModal({
  dict,
  onClose,
  onUseCategory,
}: {
  dict: Dictionary
  onClose: () => void
  // Wired for the future result panel's "use this category" action — not
  // reachable today since `result` is never set. Optional so this modal
  // doesn't require a caller to already know about that future flow.
  onUseCategory?: (category: string) => void
}) {
  const t = dict.wizard.parts.identifyPhoto
  const titleId = useId()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  // Never set today — see file header comment. Kept typed and rendered
  // conditionally so wiring in a real API later is a matter of calling
  // setResult(...), not redesigning this component.
  const [result] = useState<PartRecognitionResult | null>(null)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function acceptFile(candidate: File) {
    if (!ALLOWED_MIME_TYPES.includes(candidate.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      setError(t.errorInvalidType)
      return
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setError(t.errorTooLarge)
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(candidate)
    setPreviewUrl(URL.createObjectURL(candidate))
    setError(null)
  }

  // Shared by both hidden inputs so a camera capture and a gallery pick go
  // through exactly the same validation/preview path.
  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) acceptFile(picked)
    e.target.value = ''
  }

  function handleRemove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-card-hover outline-none sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <CameraIcon className="h-5 w-5" />
            </span>
            <p id={titleId} className="font-bold text-foreground">
              {t.modalTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition duration-200 hover:bg-accent-soft/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <XIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!file && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragActive(false)
                const dropped = e.dataTransfer.files?.[0]
                if (dropped) acceptFile(dropped)
              }}
              className={`flex flex-col items-center gap-4 rounded-2xl border border-dashed px-4 py-8 text-center transition duration-200 ${
                dragActive ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
              }`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <UploadIcon className="h-7 w-7" />
              </span>
              <p className="text-sm text-muted-foreground">{t.sourceHint}</p>
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className={buttonClasses({ variant: 'primary', size: 'md', className: 'w-full sm:flex-1' })}
                >
                  <CameraIcon className="h-5 w-5 shrink-0" />
                  {t.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className={buttonClasses({ variant: 'secondary', size: 'md', className: 'w-full sm:flex-1' })}
                >
                  <ImageIcon className="h-5 w-5 shrink-0" />
                  {t.chooseFromGallery}
                </button>
              </div>
              {/* Drag-and-drop only exists with a pointer, so only mention it there. */}
              <p className="hidden text-xs text-muted-foreground sm:block">{t.dropHint}</p>
            </div>
          )}

          {/* Two hidden inputs, one per source, both feeding handleInputChange.
              The camera one sets capture="environment" so supporting mobile
              browsers open the rear camera directly (no getUserMedia, no
              persistent permission). The gallery one deliberately has no
              `capture`: on iOS that attribute hides the photo library. On
              desktop `capture` is ignored and both simply open a file picker. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept={ACCEPT}
            capture="environment"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleInputChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleInputChange}
          />

          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {file && previewUrl && (
            <div>
              <div className="overflow-hidden rounded-2xl border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable content image */}
                <img src={previewUrl} alt={t.previewAlt} className="max-h-64 w-full object-contain" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => cameraInputRef.current?.click()} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  <CameraIcon className="h-4 w-4 shrink-0" />
                  {t.retakePhoto}
                </button>
                <button type="button" onClick={() => galleryInputRef.current?.click()} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  {t.replace}
                </button>
                <button type="button" onClick={handleRemove} className={buttonClasses({ variant: 'secondary-muted', size: 'sm' })}>
                  {t.remove}
                </button>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <CheckCircleIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.readyTitle}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t.readyDescription}</p>
                </div>
              </div>

              {/* Future result panel — see the component-level comment above.
                  `result` never becomes non-null today, so this never renders. */}
              {result && (
                <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
                  <p className="text-sm font-semibold text-foreground">{result.partName}</p>
                  <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between gap-2">
                      <dt>{t.result.categoryLabel}</dt>
                      <dd className="text-foreground">{result.category}</dd>
                    </div>
                    {result.subcategory && (
                      <div className="flex justify-between gap-2">
                        <dt>{t.result.subcategoryLabel}</dt>
                        <dd className="text-foreground">{result.subcategory}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <dt>{t.result.confidenceLabel}</dt>
                      <dd className="text-foreground">{Math.round(result.confidence * 100)}%</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-sm text-muted-foreground">{result.explanation}</p>
                  <button
                    type="button"
                    onClick={() => onUseCategory?.(result.category)}
                    className={buttonClasses({ variant: 'primary', size: 'sm', className: 'mt-3' })}
                  >
                    {t.result.useThisCategory}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="text-sm font-semibold text-accent hover:text-accent-hover">
            {t.chooseManually}
          </button>
        </div>
      </div>
    </div>
  )
}
