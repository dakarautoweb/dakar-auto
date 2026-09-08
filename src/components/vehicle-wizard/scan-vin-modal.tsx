'use client'

import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { CameraIcon } from '@/src/components/home/icons'
import { isValidVin } from '@/src/lib/vin'

type ScanPhase =
  | { name: 'idle' }
  | { name: 'starting-camera' }
  | { name: 'camera-active' }
  | { name: 'permission-denied' }
  | { name: 'camera-unavailable' }
  | { name: 'processing'; progress: number }
  | { name: 'detected'; vin: string }
  | { name: 'not-detected' }
  | { name: 'ocr-unavailable' }

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

  // Starts in 'idle' rather than auto-requesting the camera on mount —
  // the permission prompt only ever appears in response to the user
  // explicitly tapping "Start Camera" below, which keeps every state
  // transition inside a normal event handler (no effect-driven setState,
  // and no surprise permission dialog the instant the modal opens).
  const [phase, setPhase] = useState<ScanPhase>({ name: 'idle' })
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)

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
    setPhase({ name: 'starting-camera' })

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase({ name: 'camera-unavailable' })
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setPhase({ name: 'camera-active' })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPhase({ name: 'permission-denied' })
      } else {
        setPhase({ name: 'camera-unavailable' })
      }
    }
  }

  // Release the camera and any captured-image object URL when the modal
  // unmounts — this is the one genuine "external system" cleanup effect
  // here; it never sets React state itself.
  useEffect(() => {
    return () => {
      stopCamera()
      releaseCapturedPreview()
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
    dialogRef.current?.focus()
  }, [])

  async function runOcr(blob: Blob) {
    releaseCapturedPreview()
    const previewUrl = URL.createObjectURL(blob)
    capturedUrlRef.current = previewUrl
    setCapturedPreview(previewUrl)
    setPhase({ name: 'processing', progress: 0 })

    try {
      const { recognizeVin } = await import('./vin-ocr')
      const { candidate } = await recognizeVin(blob, (progress) => {
        if (progress.status === 'recognizing text') {
          setPhase({ name: 'processing', progress: progress.progress })
        }
      })

      if (candidate && isValidVin(candidate)) {
        setPhase({ name: 'detected', vin: candidate })
      } else {
        setPhase({ name: 'not-detected' })
      }
    } catch {
      setPhase({ name: 'ocr-unavailable' })
    }
  }

  function handleCapture() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    const sx = video.videoWidth * GUIDE_BAND.x
    const sy = video.videoHeight * GUIDE_BAND.y
    const sw = video.videoWidth * GUIDE_BAND.width
    const sh = video.videoHeight * GUIDE_BAND.height

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
    if (phase.name !== 'detected') return
    onVinDetected(phase.vin)
    onClose()
  }

  const showUploadFallback =
    phase.name === 'idle' ||
    phase.name === 'permission-denied' ||
    phase.name === 'camera-unavailable' ||
    phase.name === 'not-detected' ||
    phase.name === 'ocr-unavailable'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl focus:outline-none"
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
                className="mt-2 w-full rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
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
                <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                <div
                  className="pointer-events-none absolute rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                  style={{
                    left: `${GUIDE_BAND.x * 100}%`,
                    top: `${GUIDE_BAND.y * 100}%`,
                    width: `${GUIDE_BAND.width * 100}%`,
                    height: `${GUIDE_BAND.height * 100}%`,
                  }}
                />
              </div>
              <p className="mt-3 text-center text-sm font-medium">{t.guideHint}</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">{t.captureHint}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
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

          {phase.name === 'detected' && (
            <div className="flex flex-col items-center gap-3 py-2 text-center" aria-live="polite">
              {capturedPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedPreview} alt="" className="h-32 w-full rounded-xl border border-border object-cover" />
              )}
              <p className="font-semibold">{t.detectedTitle}</p>
              <p className="rounded-lg bg-surface px-4 py-2 font-mono text-lg tracking-widest">{phase.vin}</p>
              <p className="text-sm text-muted-foreground">{t.detectedDescription}</p>

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleUseVin}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
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
    </div>
  )
}
