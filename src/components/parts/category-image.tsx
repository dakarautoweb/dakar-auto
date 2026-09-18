'use client'

import { useState } from 'react'

// Renders the local category photo/render at `src` (see
// src/lib/parts-catalog.ts for the expected paths, e.g.
// /parts/categories/braking.webp) and quietly unmounts on a 404/load error
// instead of showing a broken-image icon. The parent always paints a
// gradient + icon treatment underneath (see category-step.tsx), so losing
// this layer degrades gracefully rather than breaking the layout — this is
// what lets the premium card UI ship before real photography/renders exist
// for every category.
export function CategoryImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [errored, setErrored] = useState(false)
  if (errored) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setErrored(true)} />
  )
}
