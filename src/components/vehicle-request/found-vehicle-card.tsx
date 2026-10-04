'use client'

import { useState } from 'react'

export function FoundVehicleCard({
  title,
  imageUrl,
  make,
  model,
  year,
  price,
  currency,
  yearLabel,
  priceLabel,
  priceOnRequest,
  locale,
}: {
  title: string
  imageUrl: string | null
  make: string
  model: string
  year: number
  price: number | null
  currency: string
  yearLabel: string
  priceLabel: string
  priceOnRequest: string
  locale: 'fr' | 'en'
}) {
  const fallback = '/brand/dakar-auto-logo.png'
  const [src, setSrc] = useState(imageUrl || fallback)
  return (
    <section data-tracking-card="found-vehicle" className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/5 shadow-card">
      <div className="border-b border-emerald-500/20 px-6 py-5 sm:px-8">
        <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">{title}</p>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center sm:p-8">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${make} ${model}`} onError={() => setSrc(fallback)} className={`h-full w-full ${src === fallback ? 'object-contain p-6' : 'object-cover'}`} />
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-2xl font-bold tracking-tight">{make} {model}</h3>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div><dt className="text-xs font-medium text-muted-foreground uppercase">{yearLabel}</dt><dd className="mt-1 font-semibold">{year}</dd></div>
            <div><dt className="text-xs font-medium text-muted-foreground uppercase">{priceLabel}</dt><dd className="mt-1 font-semibold text-accent">{price === null ? priceOnRequest : `${new Intl.NumberFormat(locale === 'en' ? 'en-CA' : 'fr-CA').format(price)} ${currency}`}</dd></div>
          </dl>
        </div>
      </div>
    </section>
  )
}
