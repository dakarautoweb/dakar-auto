'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { CameraIcon } from '@/src/components/home/icons'
import { isValidVin, normalizeVin } from '@/src/lib/vin'
import type { OcrOutcome, QualityCheck, QualityIssue } from './vin-ocr'

// Hydration-safe "has the client mount happened yet" check. Deliberately
// not a useState+useEffect pair (the more common way to write this) —
// this project's lint config flags synchronous setState-in-effect, and
// useSyncExternalStore is the React-endorsed way to read this kind of
// environment fact without one: it returns the server snapshot (false)
// during SSR and initial hydration, then the client snapshot (true) once
// mounted, with no effect involved at all.
const noopSubscribe = () => () => {}

// Camera/quality/OCR diagnostics below are developer-facing only — real
// users never see them. Gating on NODE_ENV (rather than deleting the
// diagnostics outright) keeps them available for debugging a future
// device-specific issue without shipping technical debug UI to
// production; Next.js inlines and dead-code-eliminates this check at
// build time, so none of the gated JSX/strings end up in the prod bundle.
const DEV_DIAGNOSTICS = process.env.NODE_ENV !== 'production'

function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}

type ScanPhase =
  | { name: 'idle' }
  | { name: 'starting-camera' }
  | { name: 'camera-active' }
  | { name: 'permission-denied'; detail?: string }
  | { name: 'camera-unavailable'; detail?: string }
  | { name: 'quality-rejected'; issue: QualityIssue }
  | { name: 'processing'; progress: number }
  | { name: 'review'; confident: boolean; qualityScore: number }
  | { name: 'not-detected' }
  | { name: 'ocr-unavailable'; detail?: string }

// The guide overlay is a centered horizontal band (VIN plates/labels are a
// long thin strip) — these fractions describe both the visual overlay
// (in CSS) and the region actually cropped out of the captured frame for
// OCR, so what the user sees lined up in the frame is what gets analyzed.
const GUIDE_BAND = { x: 0.08, y: 0.42, width: 0.84, height: 0.16 }

export function ScanVinModal({
  dict,
  onClose,
  onManual,
  onVinDetected,
}: {
  dict: Dictionary
  onClose: () => void
  onManual: () => void
  onVinDetected: (vin: string) => void
}) {
  const t = dict.wizard.scanModal
  const dialogRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const capturedUrlRef = useRef<string | null>(null)

  // The modal is portaled to document.body (see the return statement) so
  // it can never end up trapped inside an ancestor's stacking context or
  // fighting a same-z-index sibling like the sticky site header. Portals
  // still need a real DOM node, which doesn't exist during SSR, hence the
  // mounted guard: render nothing until after the client-side mount.
  const mounted = useMounted()

  // Starts in 'idle' rather than auto-requesting the camera on mount —
  // the permission prompt only ever appears in response to the user
  // explicitly tapping "Start Camera" below, which keeps every state
  // transition inside a normal event handler (no effect-driven setState,
  // and no surprise permission dialog the instant the modal opens).
  const [phase, setPhase] = useState<ScanPhase>({ name: 'idle' })
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)

  // The editable VIN shown/edited in the 'review' phase. Decoupled from
  // `phase` itself (rather than carrying `vin` on the phase object) so
  // typing in the field doesn't need to round-trip through setPhase.
  const [reviewVin, setReviewVin] = useState('')

  // Dev-only camera diagnostics (see DEV_DIAGNOSTICS) — surfaces whether
  // the stream actually attached to the <video> element and played,
  // since getUserMedia can succeed (camera light on, permission granted)
  // while the element never receives a frame, which otherwise looks
  // identical to "camera broken".
  const [videoDiag, setVideoDiag] = useState({
    stream: 'inactive',
    readyState: -1,
    width: 0,
    height: 0,
    play: 'pending',
  })

  // Dev-only OCR diagnostics (see DEV_DIAGNOSTICS) — shows exactly what
  // Tesseract received (per preprocessing pass) and what it read off each
  // one, so a bad crop or over/under-aggressive preprocessing is visible
  // instead of guessed at.
  const [ocrDiag, setOcrDiag] = useState<{
    rawText: string
    normalized: string
    candidate: string | null
    consensusQuality: number
    confident: boolean
    bestPassLabel: string
    bestPassConfidence: number
    checksum: string
    passes: { label: string; rawText: string; confidence: number; url: string }[]
  } | null>(null)
  const [qualityDiag, setQualityDiag] = useState<QualityCheck | null>(null)
  const passPreviewUrlsRef = useRef<string[]>([])

  function releasePassPreviews() {
    passPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    passPreviewUrlsRef.current = []
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function releaseCapturedPreview() {
    if (capturedUrlRef.current) {
      URL.revokeObjectURL(capturedUrlRef.current)
      capturedUrlRef.current = null
    }
    setCapturedPreview(null)
  }

  async function startCamera() {
    releaseCapturedPreview()
    setVideoDiag({ stream: 'inactive', readyState: -1, width: 0, height: 0, play: 'pending' })
    setPhase({ name: 'starting-camera' })

    if (!navigator.mediaDevices?.getUserMedia) {
      const detail = typeof navigator === 'undefined' ? 'navigator unavailable' : 'navigator.mediaDevices.getUserMedia unavailable'
      console.error('[vin-scan] camera unavailable:', detail)
      setPhase({ name: 'camera-unavailable', detail })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      // Deliberately NOT attaching to videoRef.current here: the <video>
      // element only mounts once phase becomes 'camera-active' below, so
      // videoRef.current is still null at this point on first start. The
      // attach-and-play effect (keyed on phase) below runs after that
      // mount and does the actual srcObject/play() wiring.
      streamRef.current = stream
      setPhase({ name: 'camera-active' })
    } catch (err) {
      // Never swallowed silently — logged in full, and a short version
      // shown in the UI so a real device failure is actually diagnosable
      // instead of just "nothing happened".
      const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : 'UnknownError'
      const message = err instanceof Error ? err.message : String(err)
      console.error('[vin-scan] getUserMedia failed:', name, message)
      const detail = `${name}${message ? `: ${message}` : ''}`

      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPhase({ name: 'permission-denied', detail })
      } else {
        setPhase({ name: 'camera-unavailable', detail })
      }
    }
  }

  // Attaches the already-acquired stream to the <video> element once it
  // actually exists in the DOM (it only mounts when phase is
  // 'camera-active' — see the JSX below), then plays it. Keyed on
  // phase.name so it reruns every time the element remounts, including on
  // retry after a capture. iOS Safari in particular needs readyState >= 1
  // (metadata loaded, i.e. videoWidth/videoHeight known) before play()
  // reliably renders frames instead of staying black, hence the
  // onloadedmetadata gate.
  useEffect(() => {
    if (phase.name !== 'camera-active') return
    if (!videoRef.current || !streamRef.current) return
    // Re-bound with explicit non-null types — TS's control-flow narrowing
    // above doesn't carry into the nested closures below.
    const video: HTMLVideoElement = videoRef.current
    const stream: MediaStream = streamRef.current

    function reportSize() {
      setVideoDiag((d) => ({
        ...d,
        stream: stream.active ? 'active' : 'inactive',
        readyState: video.readyState,
        width: video.videoWidth,
        height: video.videoHeight,
      }))
    }

    function attemptPlay() {
      video
        .play()
        .then(() => {
          console.log('[vin-scan] video.play() succeeded')
          setVideoDiag((d) => ({ ...d, play: 'success' }))
          reportSize()
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[vin-scan] video.play() failed:', message)
          setVideoDiag((d) => ({ ...d, play: `error: ${message}` }))
        })
    }

    video.srcObject = stream
    reportSize()

    if (video.readyState >= 1) {
      attemptPlay()
    } else {
      video.onloadedmetadata = () => {
        reportSize()
        attemptPlay()
      }
    }
    video.onloadeddata = reportSize
    video.onplaying = reportSize

    return () => {
      video.onloadedmetadata = null
      video.onloadeddata = null
      video.onplaying = null
    }
  }, [phase.name])

  // Release the camera and any captured-image object URL when the modal
  // unmounts — this is the one genuine "external system" cleanup effect
  // here; it never sets React state itself.
  useEffect(() => {
    return () => {
      stopCamera()
      releaseCapturedPreview()
      releasePassPreviews()
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    // `preventScroll` matters here: the global stylesheet sets
    // `scroll-behavior: smooth`, and without this flag some mobile
    // browsers respond to focusing a fixed-position dialog by smoothly
    // scrolling the page to "reveal" it. That animation can still be
    // settling when the user's very next tap lands — enough for the
    // browser to read it as a scroll gesture and cancel the click instead
    // of firing it, which looks exactly like "the button doesn't react".
    dialogRef.current?.focus({ preventScroll: true })
  }, [])

  async function runOcr(blob: Blob) {
    releaseCapturedPreview()
    releasePassPreviews()
    setOcrDiag(null)
    setQualityDiag(null)
    const previewUrl = URL.createObjectURL(blob)
    capturedUrlRef.current = previewUrl
    setCapturedPreview(previewUrl)
    setPhase({ name: 'processing', progress: 0 })

    try {
      const { assessImageQuality, recognizeVin } = await import('./vin-ocr')

      // Quality gate runs first, on the raw (un-preprocessed) crop — a
      // photo with no realistic chance of OCRing correctly (too blurry,
      // too dark, VIN band too small) is rejected here with an actionable
      // message instead of being fed through 4 Tesseract passes for
      // nothing. Applies identically to a camera capture and an uploaded
      // photo — both funnel through this same runOcr().
      const quality = await assessImageQuality(blob)
      setQualityDiag(quality)
      if (!quality.ok && quality.issue) {
        if (DEV_DIAGNOSTICS) console.log('[vin-scan] quality gate rejected capture:', quality)
        setPhase({ name: 'quality-rejected', issue: quality.issue })
        return
      }

      const outcome: OcrOutcome = await recognizeVin(blob, (progress) => {
        if (progress.status === 'recognizing text') {
          setPhase({ name: 'processing', progress: progress.progress })
        }
      })

      const passPreviews = outcome.passes.map((pass) => {
        const url = URL.createObjectURL(pass.blob)
        passPreviewUrlsRef.current.push(url)
        return { label: pass.label, rawText: pass.rawText, confidence: pass.confidence, url }
      })
      setOcrDiag({
        rawText: outcome.rawText,
        normalized: outcome.normalized,
        candidate: outcome.candidate,
        consensusQuality: outcome.qualityScore,
        confident: outcome.confident,
        bestPassLabel: outcome.bestPassLabel,
        bestPassConfidence: outcome.bestPassConfidence,
        checksum: outcome.checksum,
        passes: passPreviews,
      })

      if (DEV_DIAGNOSTICS) {
        console.log('[vin-scan] OCR result:', {
          candidate: outcome.candidate,
          confident: outcome.confident,
          qualityScore: outcome.qualityScore,
          checksum: outcome.checksum,
          bestPassLabel: outcome.bestPassLabel,
          passes: outcome.passes.map((p) => ({ label: p.label, confidence: p.confidence, rawText: p.rawText })),
          candidates: outcome.candidates,
        })
      }

      if (outcome.candidate && isValidVin(outcome.candidate)) {
        setReviewVin(outcome.candidate)
        setPhase({ name: 'review', confident: outcome.confident, qualityScore: outcome.qualityScore })
      } else {
        setPhase({ name: 'not-detected' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[vin-scan] OCR failed:', message)
      setPhase({ name: 'ocr-unavailable', detail: message })
    }
  }

  function handleCapture() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    // GUIDE_BAND is expressed as a fraction of the *displayed* video box,
    // but the video is rendered with `object-cover`, which — whenever the
    // camera's native frame (video.videoWidth x video.videoHeight) isn't
    // exactly the same aspect ratio as the displayed box (video.clientWidth
    // x video.clientHeight, e.g. the 4:3 container) — scales the native
    // frame up and center-crops it to fill the box. Naively multiplying
    // GUIDE_BAND fractions straight against videoWidth/videoHeight (the old
    // code) ignores that crop, so on any camera whose native stream isn't
    // already 4:3 — common on iPhone — the capture rectangle lands offset
    // from where the guide frame is actually drawn on screen. This
    // reproduces the same "visible region" math object-fit: cover performs,
    // then maps GUIDE_BAND into *that* rectangle instead of the raw frame.
    const scale = Math.max(video.clientWidth / video.videoWidth, video.clientHeight / video.videoHeight)
    const visibleWidth = video.clientWidth / scale
    const visibleHeight = video.clientHeight / scale
    const visibleX = (video.videoWidth - visibleWidth) / 2
    const visibleY = (video.videoHeight - visibleHeight) / 2

    const sx = visibleX + GUIDE_BAND.x * visibleWidth
    const sy = visibleY + GUIDE_BAND.y * visibleHeight
    const sw = GUIDE_BAND.width * visibleWidth
    const sh = GUIDE_BAND.height * visibleHeight

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setPhase({ name: 'ocr-unavailable' })
      return
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)

    stopCamera()
    canvas.toBlob(
      (blob) => {
        if (blob) runOcr(blob)
        else setPhase({ name: 'ocr-unavailable' })
      },
      'image/jpeg',
      0.92
    )
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    stopCamera()
    runOcr(file)
  }

  function handleRetry() {
    startCamera()
  }

  function handleUseVin() {
    if (phase.name !== 'review') return
    if (!isValidVin(reviewVin)) return
    onVinDetected(reviewVin)
    onClose()
  }

  const showUploadFallback =
    phase.name === 'idle' ||
    phase.name === 'permission-denied' ||
    phase.name === 'camera-unavailable' ||
    phase.name === 'quality-rejected' ||
    phase.name === 'not-detected' ||
    phase.name === 'ocr-unavailable'

  // Not mounted yet (SSR, or the first client render before effects run)
  // — createPortal needs a real document.body to attach to, which only
  // exists client-side.
  if (!mounted) return null

  return (
    <>
      {createPortal(
        <div
          // A portaled modal needs its own stacking context guaranteed
          // above everything else on the page (e.g. the sticky site
          // header), and pointer-events/touch-action set explicitly since
          // this element is appended straight to document.body rather
          // than nested in whatever stacking context rendered it.
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            pointerEvents: 'auto',
            touchAction: 'manipulation',
          }}
          className="flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            style={{
              position: 'relative',
              zIndex: 2147483647,
              pointerEvents: 'auto',
              touchAction: 'manipulation',
            }}
            className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold">{t.title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {t.close}
              </button>
            </div>

            <div className="p-5">
          {phase.name === 'idle' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <CameraIcon className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 w-full touch-manipulation rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 active:opacity-80"
              >
                {t.startCameraCta}
              </button>
            </div>
          )}

          {phase.name === 'starting-camera' && (
            <div className="flex flex-col items-center gap-3 py-8" aria-live="polite">
              <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-accent-soft text-accent">
                <CameraIcon className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">{t.startingCamera}</p>
            </div>
          )}

          {phase.name === 'camera-active' && (
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="relative z-0 block h-full w-full object-cover opacity-100"
                  style={{ visibility: 'visible' }}
                />
                <div
                  className="pointer-events-none absolute z-10 rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                  style={{
                    left: `${GUIDE_BAND.x * 100}%`,
                    top: `${GUIDE_BAND.y * 100}%`,
                    width: `${GUIDE_BAND.width * 100}%`,
                    height: `${GUIDE_BAND.height * 100}%`,
                  }}
                />
              </div>
              {DEV_DIAGNOSTICS && (
                <p className="mt-1 text-center font-mono text-[10px] break-all text-muted-foreground">
                  STREAM: {videoDiag.stream} · READY STATE: {videoDiag.readyState} · SIZE: {videoDiag.width}x
                  {videoDiag.height} · PLAY: {videoDiag.play}
                </p>
              )}
              <p className="mt-3 text-center text-sm font-medium">{t.guideHint}</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">{t.captureHint}</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">{t.scanTips}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="touch-manipulation rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 active:opacity-80"
                >
                  {t.captureButton}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {phase.name === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-4" aria-live="polite">
              {capturedPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedPreview} alt="" className="h-32 w-full rounded-xl border border-border object-cover" />
              )}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${Math.max(8, Math.round(phase.progress * 100))}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{t.analyzing}</p>
            </div>
          )}

          {phase.name === 'review' && (
            <div className="flex flex-col items-center gap-3 py-2 text-center" aria-live="polite">
              {capturedPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedPreview} alt="" className="h-32 w-full rounded-xl border border-border object-cover" />
              )}
              <p className="font-semibold">{phase.confident ? t.detectedTitle : t.possibleTitle}</p>
              {/* Always editable — per design, OCR review is never final:
                  the user can fix 1-2 misread characters right here before
                  confirming, whether the reading was confident or not. */}
              <input
                value={reviewVin}
                onChange={(event) => setReviewVin(normalizeVin(event.target.value).slice(0, 17))}
                maxLength={17}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-label={dict.hero.vinLabel}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2 text-center font-mono text-lg uppercase tracking-widest focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <p className="text-sm text-muted-foreground">{phase.confident ? t.detectedDescription : t.possibleDescription}</p>
              {reviewVin.length > 0 && !isValidVin(reviewVin) && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {reviewVin.length !== 17 ? dict.wizard.vin.errorLength : dict.wizard.vin.errorCharacters}
                </p>
              )}

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleUseVin}
                  disabled={!isValidVin(reviewVin)}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t.useVin}
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
                >
                  {dict.wizard.vin.retry}
                </button>
              </div>
            </div>
          )}

          {phase.name === 'quality-rejected' && (
            <div className="flex flex-col items-center gap-3 py-2 text-center" aria-live="polite">
              {capturedPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedPreview} alt="" className="h-32 w-full rounded-xl border border-border object-cover" />
              )}
              <p className="font-semibold">
                {phase.issue === 'blurry' && t.tooBlurryTitle}
                {phase.issue === 'too-dark' && t.tooDarkTitle}
                {phase.issue === 'too-small' && t.tooFarTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {phase.issue === 'blurry' && t.tooBlurryDescription}
                {phase.issue === 'too-dark' && t.tooDarkDescription}
                {phase.issue === 'too-small' && t.tooFarDescription}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
                >
                  {dict.wizard.vin.retry}
                </button>
              </div>
            </div>
          )}

          {(phase.name === 'not-detected' ||
            phase.name === 'ocr-unavailable' ||
            phase.name === 'permission-denied' ||
            phase.name === 'camera-unavailable') && (
            <div className="flex flex-col items-center gap-3 py-2 text-center" aria-live="polite">
              <p className="font-semibold">
                {phase.name === 'not-detected' && t.notFoundTitle}
                {phase.name === 'ocr-unavailable' && t.notFoundTitle}
                {phase.name === 'permission-denied' && t.permissionDeniedTitle}
                {phase.name === 'camera-unavailable' && t.cameraUnavailableTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {phase.name === 'not-detected' && t.notFoundDescription}
                {phase.name === 'ocr-unavailable' && t.ocrUnavailableDescription}
                {phase.name === 'permission-denied' && t.permissionDeniedDescription}
                {phase.name === 'camera-unavailable' && t.cameraUnavailableDescription}
              </p>

              {'detail' in phase && phase.detail && (
                <p className="max-w-full break-words rounded-lg bg-surface px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {t.technicalDetail}: {phase.detail}
                </p>
              )}

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {(phase.name === 'not-detected' || phase.name === 'ocr-unavailable') && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
                  >
                    {dict.wizard.vin.retry}
                  </button>
                )}
              </div>
            </div>
          )}

          {DEV_DIAGNOSTICS && qualityDiag && (phase.name === 'processing' || phase.name === 'quality-rejected') && (
            <div className="mt-4 space-y-1 border-t border-dashed border-border pt-3">
              <p className="font-mono text-[10px] break-all text-muted-foreground">
                QUALITY GATE: {qualityDiag.ok ? 'pass' : `reject (${qualityDiag.issue})`} · SHARPNESS:{' '}
                {qualityDiag.metrics.sharpness.toFixed(1)} · BRIGHTNESS: {qualityDiag.metrics.brightness.toFixed(0)} · CROP
                HEIGHT: {qualityDiag.metrics.height}px
              </p>
            </div>
          )}

          {DEV_DIAGNOSTICS &&
            ocrDiag &&
            (phase.name === 'processing' || phase.name === 'review' || phase.name === 'not-detected' || phase.name === 'ocr-unavailable') && (
              <div className="mt-4 space-y-2 border-t border-dashed border-border pt-3">
                <p className="font-mono text-[10px] break-all text-muted-foreground">RAW OCR: {ocrDiag.rawText || '(empty)'}</p>
                <p className="font-mono text-[10px] break-all text-muted-foreground">NORMALIZED: {ocrDiag.normalized || '(empty)'}</p>
                <p className="font-mono text-[10px] break-all text-muted-foreground">CONSENSUS CANDIDATE: {ocrDiag.candidate ?? '(none)'}</p>
                <p className="font-mono text-[10px] break-all text-muted-foreground">
                  QUALITY SCORE: {ocrDiag.consensusQuality} ({ocrDiag.confident ? 'confident' : 'uncertain'}) · CHECKSUM:{' '}
                  {ocrDiag.checksum}
                </p>
                <p className="font-mono text-[10px] break-all text-muted-foreground">
                  BEST PASS: {ocrDiag.bestPassLabel} ({ocrDiag.bestPassConfidence.toFixed(1)}% OCR confidence)
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ocrDiag.passes.map((pass) => (
                    <div key={pass.label} className="flex-shrink-0 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pass.url}
                        alt={pass.label}
                        className={`h-20 w-32 rounded border bg-surface object-contain ${
                          pass.label === ocrDiag.bestPassLabel ? 'border-accent' : 'border-border'
                        }`}
                      />
                      <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                        {pass.label} ({pass.confidence.toFixed(0)}%)
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {showUploadFallback && (
            <div className="mt-4 flex flex-col items-center gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
              >
                {t.uploadCta}
              </button>
              <button
                type="button"
                onClick={onManual}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {t.manualCta}
              </button>
            </div>
          )}

          {phase.name === 'camera-active' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 w-full text-center text-sm font-medium text-accent hover:underline"
            >
              {t.uploadCta}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
          aria-label={t.uploadCta}
        />
      </div>
    </div>,
        document.body
      )}
    </>
  )
}
