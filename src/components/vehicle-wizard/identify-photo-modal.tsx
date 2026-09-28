'use client'

import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from 'react'
import type { Locale } from '@/src/i18n/config'
import type { Dictionary } from '@/src/i18n/dictionaries'
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CameraIcon,
  CategoryIcon,
  CheckCircleIcon,
  ImageIcon,
  LayersIcon,
  OtherPartIcon,
  RefreshIcon,
  SubcategoryIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from '@/src/components/home/icons'
import { buttonClasses } from '@/src/components/ui/styles'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import { requestPartRecognition, type ClientRecognitionOutcome } from '@/src/lib/part-recognition/client'
import type { PartRecognitionCandidate, PartRecognitionResult, RecognitionVehicleContext } from '@/src/lib/part-recognition/types'
import {
  candidateAsResult,
  planRecognitionApplication,
  resolveCategoryLabel,
  resolveSubcategoryLabel,
} from '@/src/lib/part-recognition/wizard-mapping'
import { PhotoCameraSession, browserCameraEnv, type CameraErrorKind, type CameraFacing } from '@/src/lib/photo-camera'

const ACCEPT = ALLOWED_MIME_TYPES.join(',')

// In-modal camera ("Prendre une photo"). 'capture' = the frame could not be
// encoded after the shutter was pressed.
type CameraState =
  | { phase: 'off' }
  | { phase: 'starting' }
  | { phase: 'live'; stream: MediaStream; canSwitch: boolean }
  | { phase: 'error'; kind: CameraErrorKind | 'capture' }

type Analysis = { phase: 'idle' } | { phase: 'analyzing' } | { phase: 'done'; result: PartRecognitionResult } | { phase: 'error'; message: string }

// Photo → part recognition (see category-step.tsx for where this opens
// from). The customer picks a photo, then explicitly presses "Analyze" —
// selecting a photo alone never calls the AI. The photo goes only to our
// own /api/part-recognition route (which forwards it to OpenAI and stores
// nothing); it is never uploaded to Storage by this modal.
export function IdentifyPhotoModal({
  dict,
  locale,
  vehicle,
  onClose,
  onUseResult,
}: {
  dict: Dictionary
  locale: Locale
  // Year/make/model/engine only — never the VIN.
  vehicle: RecognitionVehicleContext | null
  onClose: () => void
  onUseResult?: (result: PartRecognitionResult) => void
}) {
  const t = dict.wizard.parts.identifyPhoto
  const titleId = useId()
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // The in-flight request, if any — aborted on close/unmount and used to
  // refuse a second concurrent analysis.
  const abortRef = useRef<AbortController | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis>({ phase: 'idle' })
  const analyzing = analysis.phase === 'analyzing'

  const cameraRef = useRef<PhotoCameraSession | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureButtonRef = useRef<HTMLButtonElement>(null)
  const [camera, setCamera] = useState<CameraState>({ phase: 'off' })
  const [facing, setFacing] = useState<CameraFacing>('environment')
  const liveStream = camera.phase === 'live' ? camera.stream : null

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

  // Closing the modal mid-analysis cancels the browser request (and, via
  // the request signal, the server's provider call).
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  // The camera is never left running: it stops on capture, cancel, a switch
  // to the gallery, and here when the modal closes/unmounts (the session
  // also releases a stream that only arrives after that).
  useEffect(() => {
    return () => cameraRef.current?.stop()
  }, [])

  // Attach the live stream once the <video> exists (it mounts with the
  // 'live' phase), then move focus to the shutter button.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !liveStream) return
    video.srcObject = liveStream
    video.play().catch(() => {
      // autoPlay + muted normally covers this; nothing useful to show.
    })
    captureButtonRef.current?.focus()
    return () => {
      video.srcObject = null
    }
  }, [liveStream])

  async function openCamera(nextFacing: CameraFacing = 'environment') {
    if (analyzing) return
    cameraRef.current ??= new PhotoCameraSession(browserCameraEnv())
    setError(null)
    setFacing(nextFacing)
    setCamera({ phase: 'starting' })
    const outcome = await cameraRef.current.start(nextFacing)
    if (outcome.ok) setCamera({ phase: 'live', stream: outcome.stream, canSwitch: outcome.canSwitch })
    else if (outcome.error !== 'cancelled') setCamera({ phase: 'error', kind: outcome.error })
  }

  function closeCamera() {
    cameraRef.current?.stop()
    setCamera({ phase: 'off' })
    panelRef.current?.focus()
  }

  async function handleCapture() {
    const video = videoRef.current
    const session = cameraRef.current
    if (!video || !session) return
    const captured = await session.capture(video)
    if (!captured) {
      session.stop()
      setCamera({ phase: 'error', kind: 'capture' })
      return
    }
    setCamera({ phase: 'off' })
    // Same validation + preview path as a gallery pick or a drop; the AI is
    // only called when the customer presses "Analyze".
    acceptFile(captured)
  }

  function openGallery() {
    if (camera.phase !== 'off') {
      cameraRef.current?.stop()
      setCamera({ phase: 'off' })
    }
    galleryInputRef.current?.click()
  }

  function cameraErrorMessage(kind: CameraErrorKind | 'capture'): string {
    const c = t.camera
    switch (kind) {
      case 'permission_denied':
        return c.errorPermission
      case 'not_found':
        return c.errorNotFound
      case 'in_use':
        return c.errorInUse
      case 'insecure':
      case 'unsupported':
        return c.errorUnsupported
      case 'capture':
        return c.errorCapture
      default:
        return c.errorGeneric
    }
  }

  function acceptFile(candidate: File) {
    if (analyzing) return
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
    setAnalysis({ phase: 'idle' })
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) acceptFile(picked)
    e.target.value = ''
  }

  function handleRemove() {
    if (analyzing) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    setAnalysis({ phase: 'idle' })
  }

  function errorMessage(outcome: Extract<ClientRecognitionOutcome, { ok: false }>): string {
    switch (outcome.error) {
      case 'too_large':
        return t.errorTooLarge
      case 'unsupported_type':
      case 'empty_image':
      case 'missing_image':
        return t.errorInvalidType
      case 'timeout':
        return t.errorTimeout
      case 'rate_limited':
        return t.errorRateLimited
      default:
        return t.errorUnavailable
    }
  }

  // One request at a time, never retried automatically — each call is a
  // billed AI request, so retrying is always the customer's choice.
  async function handleAnalyze() {
    if (!file || abortRef.current) return
    const controller = new AbortController()
    abortRef.current = controller
    setAnalysis({ phase: 'analyzing' })
    const outcome = await requestPartRecognition(file, { locale, vehicle }, controller.signal)
    if (abortRef.current !== controller) return
    abortRef.current = null
    if (outcome.ok) setAnalysis({ phase: 'done', result: outcome.result })
    else if (outcome.error !== 'aborted') setAnalysis({ phase: 'error', message: errorMessage(outcome) })
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
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-card-hover outline-none sm:w-[calc(100vw-32px)] sm:max-w-[560px] sm:rounded-3xl"
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
          {camera.phase !== 'off' && (
            <CameraView
              t={t}
              camera={camera}
              videoRef={videoRef}
              captureButtonRef={captureButtonRef}
              errorMessage={camera.phase === 'error' ? cameraErrorMessage(camera.kind) : null}
              onCapture={handleCapture}
              onCancel={closeCamera}
              onRetry={() => openCamera(facing)}
              onSwitch={() => openCamera(facing === 'environment' ? 'user' : 'environment')}
              onGallery={openGallery}
            />
          )}

          {!file && camera.phase === 'off' && (
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
              className={`flex flex-col items-center rounded-2xl border border-dashed px-4 py-9 text-center transition duration-200 sm:py-10 ${
                dragActive ? 'border-accent bg-accent-soft' : 'border-border bg-surface'
              }`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-sm">
                <UploadIcon className="h-8 w-8" />
              </span>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">{t.sourceHint}</p>
              {/* Two equal-weight choice cards: side by side from sm up, stacked
                  full-width below that, where the French labels would otherwise
                  be squeezed into ~150px columns. */}
              <div className="mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openCamera()}
                  className="inline-flex h-16 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-card transition duration-200 hover:-translate-y-px hover:bg-accent-hover hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-0 active:scale-[0.98] active:bg-accent sm:h-[74px] sm:text-[15px]"
                >
                  <CameraIcon className="h-5 w-5 shrink-0" />
                  {t.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={openGallery}
                  className="inline-flex h-16 w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-card transition duration-200 hover:-translate-y-px hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:translate-y-0 active:scale-[0.98] sm:h-[74px] sm:text-[15px]"
                >
                  <ImageIcon className="h-5 w-5 shrink-0" />
                  {t.chooseFromGallery}
                </button>
              </div>
              {/* Drag-and-drop only exists with a pointer, so only mention it there. */}
              <p className="mt-5 hidden text-xs text-muted-foreground sm:block">{t.dropHint}</p>
            </div>
          )}

          {/* Gallery source. Deliberately no `capture`: on iOS that attribute
              hides the photo library. "Take a photo" uses the in-modal
              camera (CameraView) rather than a file input, since desktop
              browsers ignore `capture` and would just open a file picker. */}
          <input
            ref={galleryInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleInputChange}
          />

          {error && camera.phase === 'off' && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {file && previewUrl && camera.phase === 'off' && (
            <div>
              <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable content image */}
                <img
                  src={previewUrl}
                  alt={t.previewAlt}
                  className={`max-h-64 w-full object-contain transition duration-300 ${analyzing ? 'opacity-60' : ''}`}
                />
                {analyzing && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute inset-x-0 top-0 h-1/3 animate-[scan_1.6s_ease-in-out_infinite_alternate] bg-gradient-to-b from-transparent via-accent/25 to-transparent" />
                  </div>
                )}
              </div>

              {analysis.phase !== 'done' && (
                <div className="mt-3">
                  {/* Equal-width pair (auto-fit grid): side by side
                      whenever both labels fit, stacked full-width only on
                      very narrow screens — labels never wrap. */}
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.25rem),1fr))] gap-2">
                    <button
                      type="button"
                      disabled={analyzing}
                      onClick={() => openCamera()}
                      className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'whitespace-nowrap' })}
                    >
                      <CameraIcon className="h-4 w-4 shrink-0" />
                      {t.retakePhoto}
                    </button>
                    <button
                      type="button"
                      disabled={analyzing}
                      onClick={() => galleryInputRef.current?.click()}
                      className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'whitespace-nowrap' })}
                    >
                      <ImageIcon className="h-4 w-4 shrink-0" />
                      {t.replace}
                    </button>
                  </div>
                  {/* Destructive, deliberately weaker than the pair above. */}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={analyzing}
                      onClick={handleRemove}
                      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border/70 bg-surface/60 px-3 text-xs font-medium text-muted-foreground transition duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-600 focus-visible:border-red-500/50 focus-visible:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 dark:hover:text-red-400 dark:focus-visible:text-red-400"
                    >
                      <TrashIcon className="h-3.5 w-3.5 shrink-0" />
                      {t.remove}
                    </button>
                  </div>
                </div>
              )}

              {analysis.phase === 'idle' && (
                <>
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <CheckCircleIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.readyTitle}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{t.readyDescription}</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleAnalyze} className={buttonClasses({ variant: 'primary', size: 'md', className: 'mt-4 w-full' })}>
                    {t.analyze}
                  </button>
                </>
              )}

              {analyzing && (
                <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.analyzing}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.analyzingHint}</p>
                  </div>
                </div>
              )}

              {analysis.phase === 'error' && (
                <div role="alert" className="mt-4 rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-foreground">{analysis.message}</p>
                  </div>
                  <button type="button" onClick={handleAnalyze} className={buttonClasses({ variant: 'primary', size: 'sm', className: 'mt-3' })}>
                    <RefreshIcon className="h-4 w-4" />
                    {t.retry}
                  </button>
                </div>
              )}

              {analysis.phase === 'done' && (
                <RecognitionResultPanel dict={dict} result={analysis.result} onUse={onUseResult} onAnalyzeAnother={handleRemove} />
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

// Live camera, replacing the upload area inside the same modal. The preview
// uses object-contain so what the customer sees is exactly the frame that
// gets captured (letterboxed on the dark frame, never cropped).
function CameraView({
  t,
  camera,
  videoRef,
  captureButtonRef,
  errorMessage,
  onCapture,
  onCancel,
  onRetry,
  onSwitch,
  onGallery,
}: {
  t: Dictionary['wizard']['parts']['identifyPhoto']
  camera: Exclude<CameraState, { phase: 'off' }>
  videoRef: RefObject<HTMLVideoElement | null>
  captureButtonRef: RefObject<HTMLButtonElement | null>
  errorMessage: string | null
  onCapture: () => void
  onCancel: () => void
  onRetry: () => void
  onSwitch: () => void
  onGallery: () => void
}) {
  const c = t.camera

  if (camera.phase === 'error') {
    const canRetry = camera.kind !== 'insecure' && camera.kind !== 'unsupported' && camera.kind !== 'not_found'
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div role="alert" className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertCircleIcon className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-foreground">{errorMessage}</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={onGallery} className={buttonClasses({ variant: 'primary', size: 'sm', className: 'whitespace-nowrap' })}>
            <ImageIcon className="h-4 w-4 shrink-0" />
            {t.chooseFromGallery}
          </button>
          {canRetry && (
            <button type="button" onClick={onRetry} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'whitespace-nowrap' })}>
              <RefreshIcon className="h-4 w-4 shrink-0" />
              {t.retry}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className={buttonClasses({ variant: 'secondary', size: 'sm', className: `whitespace-nowrap ${canRetry ? 'sm:col-span-2' : ''}` })}
          >
            {c.cancel}
          </button>
        </div>
      </div>
    )
  }

  const live = camera.phase === 'live'
  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/10">
        {live ? (
          <video ref={videoRef} autoPlay playsInline muted aria-label={c.previewLabel} className="block h-full w-full object-contain" />
        ) : (
          <div role="status" aria-live="polite" className="flex h-full flex-col items-center justify-center gap-3 text-white/80">
            <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-accent/15 text-accent">
              <CameraIcon className="h-7 w-7" />
            </span>
            <p className="text-sm">{c.starting}</p>
          </div>
        )}
        {live && camera.canSwitch && (
          <button
            type="button"
            onClick={onSwitch}
            aria-label={c.switchCamera}
            title={c.switchCamera}
            className="absolute top-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition duration-200 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <RefreshIcon className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">{c.hint}</p>
      <button
        ref={captureButtonRef}
        type="button"
        onClick={onCapture}
        disabled={!live}
        className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent px-4 text-[15px] font-semibold text-accent-foreground shadow-card transition duration-200 hover:-translate-y-px hover:bg-accent-hover hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        <CameraIcon className="h-5 w-5 shrink-0" />
        {c.capture}
      </button>
      <button type="button" onClick={onCancel} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'mt-2 w-full' })}>
        {c.cancel}
      </button>
    </div>
  )
}

function RecognitionResultPanel({
  dict,
  result,
  onUse,
  onAnalyzeAnother,
}: {
  dict: Dictionary
  result: PartRecognitionResult
  onUse?: (result: PartRecognitionResult) => void
  onAnalyzeAnother: () => void
}) {
  const t = dict.wizard.parts.identifyPhoto
  const labels = dict.categories.items
  const plan = planRecognitionApplication(result, labels)

  const analyzeAnother = (label: string) => (
    <button type="button" onClick={onAnalyzeAnother} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
      <CameraIcon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  )

  if (result.status === 'not_a_part') {
    return (
      <div role="status" className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircleIcon className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-foreground">{t.result.notAPartTitle}</p>
        </div>
        <div className="mt-3">{analyzeAnother(t.result.retryWithAnotherPhoto)}</div>
      </div>
    )
  }

  if (result.status === 'multiple_parts' && result.candidates.length > 1) {
    return (
      <MultiplePartsPanel
        dict={dict}
        result={result}
        onPick={(candidate) => onUse?.(candidateAsResult(candidate, result))}
        analyzeAnotherButton={analyzeAnother(t.analyzeAnother)}
      />
    )
  }

  if (plan.kind === 'manual') {
    // Uncertain, or a real part outside the catalog: no category is
    // pretended — the customer chooses manually (footer link) or retries.
    const isOther = result.status === 'identified' && result.category === 'other'
    return (
      <div role="status" className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircleIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{isOther ? t.result.otherTitle : t.result.uncertainTitle}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{isOther ? t.result.otherDescription : t.result.uncertainDescription}</p>
          </div>
        </div>
        {result.partName && (
          <dl className="mt-3 flex justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{t.result.partNameLabel}</dt>
            <dd className="text-right font-medium text-foreground">{result.partName}</dd>
          </dl>
        )}
        {result.explanation && <p className="mt-2 text-sm text-muted-foreground">{result.explanation}</p>}
        <div className="mt-3">{analyzeAnother(t.analyzeAnother)}</div>
      </div>
    )
  }

  const categoryLabel = resolveCategoryLabel(labels, plan.category)
  const subcategoryLabel = plan.kind === 'details' ? plan.subcategory.label : null
  const title = plan.kind === 'details' ? plan.partName : (result.partName ?? categoryLabel)

  const details = [
    { label: t.result.categoryLabel, value: categoryLabel },
    ...(subcategoryLabel ? [{ label: t.result.subcategoryLabel, value: subcategoryLabel }] : []),
    { label: t.result.confidenceLabel, value: `${Math.round(result.confidence * 100)} %` },
  ]

  return (
    <div role="status" className="@container mt-4 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CheckCircleIcon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{t.result.identifiedTitle}</p>
      </div>
      <p className="mt-2 text-lg leading-snug font-bold text-foreground">{title}</p>

      {/* Label/value rows: zebra shading + hairline dividers, values bolder
          than labels so the eye lands on the answer, not the field name. */}
      <dl className="mt-3 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/60 text-sm">
        {details.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 px-3 py-2.5 even:bg-foreground/[0.04]">
            <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 text-right font-semibold text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>

      {result.explanation && (
        <p className="mt-4 border-l-2 border-accent/30 pl-3 text-[13px] leading-relaxed text-muted-foreground">{result.explanation}</p>
      )}
      {plan.kind === 'subcategory' && <p className="mt-2 text-xs text-muted-foreground">{t.result.confirmSubcategoryHint}</p>}

      {/* One row whenever the card itself is wide enough (container query,
          so it tracks the modal's width, not the viewport's); stacked only
          on genuinely narrow cards. flex-auto rather than flex-1 so the
          longer label gets the extra room instead of being squeezed. */}
      <div className="mt-4 flex flex-col gap-2 @min-[23rem]:flex-row">
        <button
          type="button"
          onClick={() => onUse?.(result)}
          className={buttonClasses({ variant: 'primary', size: 'sm', className: 'flex-auto whitespace-nowrap' })}
        >
          {plan.kind === 'details' ? t.result.useThisPart : t.result.useThisCategory}
        </button>
        <button
          type="button"
          onClick={onAnalyzeAnother}
          className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'flex-auto whitespace-nowrap' })}
        >
          {t.analyzeAnother}
        </button>
      </div>
    </div>
  )
}

function CandidateIcon({ candidate }: { candidate: PartRecognitionCandidate }) {
  if (candidate.subcategory) return <SubcategoryIcon name={candidate.subcategory} className="h-6 w-6" />
  if (candidate.category !== 'other') return <CategoryIcon name={candidate.category} className="h-6 w-6" />
  return <OtherPartIcon className="h-6 w-6" />
}

// Several distinct parts in one photo (e.g. rotors + pads): each candidate
// is itself the action — one tap applies it through candidateAsResult, the
// same routing as "Use this part". No separate confirm button.
function MultiplePartsPanel({
  dict,
  result,
  onPick,
  analyzeAnotherButton,
}: {
  dict: Dictionary
  result: PartRecognitionResult
  onPick: (candidate: PartRecognitionCandidate) => void
  analyzeAnotherButton: ReactNode
}) {
  const t = dict.wizard.parts.identifyPhoto
  const labels = dict.categories.items

  return (
    <div role="status" className="mt-4 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <LayersIcon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{t.result.multiplePartsTitle}</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.result.multiplePartsDescription}</p>

      <ul className="mt-3 space-y-2">
        {result.candidates.map((candidate) => {
          const categoryLabel = candidate.category === 'other' ? null : resolveCategoryLabel(labels, candidate.category)
          const subcategoryLabel = categoryLabel && candidate.subcategory ? resolveSubcategoryLabel(labels, candidate.category, candidate.subcategory) : null
          const name = candidate.partName || subcategoryLabel || categoryLabel || t.result.otherTitle
          const meta = [categoryLabel ?? t.result.otherTitle, subcategoryLabel].filter(Boolean).join(' · ')
          return (
            <li key={`${candidate.category}|${candidate.subcategory ?? ''}`}>
              <button
                type="button"
                onClick={() => onPick(candidate)}
                className="group flex min-h-16 w-full items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-3 text-left transition duration-200 hover:border-accent/60 hover:bg-card focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent" aria-hidden="true">
                  <CandidateIcon candidate={candidate} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug font-semibold break-words text-foreground">{name}</span>
                  <span className="mt-0.5 block text-xs break-words text-muted-foreground">{meta}</span>
                </span>
                {/* Visually secondary; the label stays for screen readers
                    and on hover — it's the model's estimate, not a probability. */}
                <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums" title={t.result.confidenceLabel}>
                  <span className="sr-only">{t.result.confidenceLabel} </span>
                  {Math.round(candidate.confidence * 100)} %
                </span>
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground transition duration-200 group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-4">{analyzeAnotherButton}</div>
    </div>
  )
}
