'use client'

import { useEffect, useRef, useState } from 'react'
import { Car } from 'lucide-react'

// Single shared fallback asset — drop a real photo in at this path
// (public/vehicle-fallback.png) to replace it. Per design: a real black
// premium vehicle, front 3/4 view, transparent background, clean showroom
// look. Every caller of <VehicleImage> without a real photo URL renders
// this same file, so there is exactly one place to swap the asset.
const FALLBACK_SRC = '/vehicle-fallback.png'

export function VehicleImage({
  src,
  alt = '',
  className = 'h-full w-full object-cover',
  fallbackClassName = 'h-full w-full object-contain',
  showReflection = false,
  variant = 'photo',
  placeholderLabel,
}: {
  // A real photo URL (e.g. from Auto.dev lookup or an uploaded listing
  // photo). Falsy, or failing to load, falls back to FALLBACK_SRC — this
  // is the one "real API image > fallback image" rule, applied the same
  // way everywhere instead of being re-implemented per call site.
  src?: string | null
  alt?: string
  className?: string
  fallbackClassName?: string
  // Adds a soft contact-shadow ellipse under the fallback image — the
  // "showroom" look for standalone/hero placements. Off by default since
  // it doesn't suit a small cropped thumbnail in a list/card.
  showReflection?: boolean
  // 'photo' (default, unchanged): renders FALLBACK_SRC, the generic
  // showroom vehicle photo — used on public-facing pages (wizard result
  // cards, hero) where a photo-shaped placeholder fits the surrounding
  // imagery. 'placeholder': a plain icon + label instead of a photo — for
  // admin panels where the surrounding container already supplies its own
  // dark card chrome (bg/border) and a second photo-style image inside it
  // would look like a broken-content box rather than an empty state.
  variant?: 'photo' | 'placeholder'
  // Required for variant="placeholder" — caller passes the already-
  // translated string (this component has no access to Dictionary).
  placeholderLabel?: string
}) {
  const [failed, setFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const useFallback = !src || failed

  useEffect(() => {
    // Same-origin/cached URLs can finish failing before hydration attaches
    // this component's onError listener — the browser never re-fires an
    // event that already happened, which would otherwise leave the native
    // broken-image icon on screen with no error ever reaching React. This
    // catches that already-failed state once on mount/src-change, on top of
    // the normal onError handler below for everything that fails later.
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true)
    }
  }, [src])

  if (!useFallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img ref={imgRef} src={src} alt={alt} className={className} onError={() => setFailed(true)} />
    )
  }

  if (variant === 'placeholder') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
        <Car className="h-8 w-8 text-accent" strokeWidth={1.5} aria-hidden="true" />
        {placeholderLabel && <p className="text-xs font-medium text-muted-foreground">{placeholderLabel}</p>}
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={FALLBACK_SRC} alt={alt} className={fallbackClassName} />
      {showReflection && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[6%] left-1/2 h-[10%] w-[65%] -translate-x-1/2 rounded-full bg-black/25 blur-lg dark:bg-black/45"
        />
      )}
    </div>
  )
}
