import { CarSideIcon } from './icons'

// Real manufacturer logos are trademarked assets we don't have a license to
// ship — scraping/embedding them would repeat the "no copyrighted third-
// party images" mistake this project explicitly avoids for category photos.
// Instead we derive a deterministic monogram from the decoded make, which
// is always available (no network fetch, so no failure mode) and never
// breaks layout. Swap in real licensed logo assets later at
// /public/brands/<make-slug>.svg if the business secures them — this
// component's job then becomes "look up asset, else monogram".
const KNOWN_MONOGRAMS: Record<string, string> = {
  'mercedes-benz': 'MB',
  'land rover': 'LR',
  'alfa romeo': 'AR',
  'rolls-royce': 'RR',
  'aston martin': 'AM',
  'great wall': 'GW',
}

// Exported so other real-logo-aware badges (e.g. hero-vehicle-result.tsx)
// can reuse the exact same fallback text instead of duplicating it —
// BrandBadge's own rendering/behavior below is unchanged.
export function monogramFor(make: string): string {
  const normalized = make.trim().toLowerCase()
  if (KNOWN_MONOGRAMS[normalized]) return KNOWN_MONOGRAMS[normalized]

  const words = make.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return ''
}

export function BrandBadge({ make, className = '' }: { make: string | null | undefined; className?: string }) {
  const monogram = make ? monogramFor(make) : ''

  return (
    <span
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-surface-raised text-sm font-bold tracking-wide text-accent shadow-glow ${className}`}
      aria-hidden="true"
    >
      {monogram || <CarSideIcon className="h-5 w-5" />}
    </span>
  )
}
