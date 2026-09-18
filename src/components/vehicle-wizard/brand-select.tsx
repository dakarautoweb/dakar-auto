'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { OTHER_BRAND_VALUE, VEHICLE_BRANDS, brandLogoSrc } from '@/src/lib/vehicle-brands'
import { inputClass } from '@/src/components/ui/styles'
import { ChevronDownIcon, OtherIcon, SearchIcon } from '@/src/components/home/icons'

// Small, consistent logo chip — brightness/contrast (light theme only,
// reset under dark:) darkens the many chrome/silver source files that
// would otherwise wash out against a light dropdown/trigger background.
// Same recipe as the VIN-result brand marks (BrandLogo, ResultBrandLogo).
function BrandLogoChip({ slug }: { slug: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brandLogoSrc(slug)}
      alt=""
      className="h-5 w-5 shrink-0 object-contain brightness-[0.4] contrast-125 dark:brightness-100 dark:contrast-100"
    />
  )
}

// Custom searchable combobox for "Marque" — a native <select> can't render
// a logo next to each option, so this is a button + absolutely-positioned
// listbox instead, styled to match every other field's inputClass exactly.
// `value` is either a known brand's display name, OTHER_BRAND_VALUE, or ''
// (nothing picked yet) — ManualVehicleForm decides what to do with
// OTHER_BRAND_VALUE (show the free-text field, substitute its value as the
// real make on submit).
export function BrandSelect({
  id,
  dict,
  value,
  onChange,
}: {
  id: string
  dict: Dictionary
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return VEHICLE_BRANDS
    return VEHICLE_BRANDS.filter((brand) => brand.name.toLowerCase().includes(q))
  }, [query])

  const selectedBrand = VEHICLE_BRANDS.find((brand) => brand.name === value)
  const isOther = value === OTHER_BRAND_VALUE

  function select(next: string) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selectedBrand ? (
            <>
              <BrandLogoChip slug={selectedBrand.slug} />
              <span className="truncate">{selectedBrand.name}</span>
            </>
          ) : isOther ? (
            <>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <OtherIcon className="h-3 w-3" />
              </span>
              <span className="truncate">{dict.wizard.manual.otherBrand}</span>
            </>
          ) : (
            <span className="truncate text-muted-foreground">{dict.wizard.manual.makePlaceholder}</span>
          )}
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card-hover">
          <div className="border-b border-border p-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={dict.wizard.manual.makeSearchPlaceholder}
                className="w-full rounded-lg border border-border bg-surface-raised py-2 pr-2 pl-8 text-sm text-foreground focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <ul role="listbox" aria-label={dict.wizard.manual.makeLabel} className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2.5 text-sm text-muted-foreground">{dict.wizard.manual.makeNoResults}</li>}
            {filtered.map((brand) => (
              <li key={brand.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === brand.name}
                  onClick={() => select(brand.name)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition duration-150 ${
                    value === brand.name ? 'bg-accent-soft text-accent' : 'text-foreground hover:bg-surface'
                  }`}
                >
                  <BrandLogoChip slug={brand.slug} />
                  <span className="truncate">{brand.name}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-1">
            <button
              type="button"
              role="option"
              aria-selected={isOther}
              onClick={() => select(OTHER_BRAND_VALUE)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition duration-150 ${
                isOther ? 'bg-accent-soft text-accent' : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-dashed border-border">
                <OtherIcon className="h-3 w-3" />
              </span>
              {dict.wizard.manual.otherBrand}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
