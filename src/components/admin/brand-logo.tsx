'use client'

import { useState } from 'react'
import { Car } from 'lucide-react'
import { getBrandLogoPath } from '@/src/lib/brand-logos'

// Small neutral badge for the admin requests tables' VÉHICULE column —
// resolved via getBrandLogoPath (public/brands/*.png), never the public
// "Marques prises en charge" list. `grayscale` + reduced opacity keeps every
// logo reading as the same neutral/silver size and tone regardless of the
// source file's own colors, so the column stays calm at a glance. Falls
// back to a generic vehicle glyph both when there's no known file for this
// make AND when the resolved file actually fails to load (onError) — the
// column never shows a broken image.
export function BrandLogo({ make, className = 'h-7 w-7' }: { make: string | null | undefined; className?: string }) {
  const path = getBrandLogoPath(make)
  const [failed, setFailed] = useState(false)

  if (!path || failed) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-surface text-muted-foreground ${className}`}>
        <Car className="h-[65%] w-[65%]" strokeWidth={1.75} />
      </span>
    )
  }

  return (
    // brightness/contrast (light theme only, reset under dark:) darkens the
    // many chrome/silver source files that would otherwise disappear
    // against this table's light-theme row background.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={path}
      alt=""
      onError={() => setFailed(true)}
      className={`shrink-0 object-contain opacity-90 grayscale brightness-[0.4] contrast-125 dark:brightness-100 dark:contrast-100 ${className}`}
    />
  )
}
