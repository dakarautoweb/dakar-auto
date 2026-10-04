// Filled/solid sidebar nav icons — lucide-react (this project's only icon
// dependency) ships stroke-only outlines with no solid variant, and adding
// a second icon library just for 7 glyphs would be exactly the "heavy
// dependency for no reason" the brief calls out. These are small
// hand-drawn solid shapes instead: same visual weight/density across all
// seven, single `fill="currentColor"` (plus `opacity` for intentional
// layering only — never a second hardcoded color, so every icon still
// adapts correctly to any background: graphite on the sidebar, white on
// the active item's orange pill, without a "cutout" trick that would only
// match one specific backdrop).
type IconProps = { className?: string }

export function DashboardFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3" y="3" width="8" height="10" rx="2" />
      <rect x="13" y="3" width="8" height="6" rx="2" />
      <rect x="13" y="11" width="8" height="10" rx="2" />
      <rect x="3" y="15" width="8" height="6" rx="2" />
    </svg>
  )
}

// Stacked documents, not a lined clipboard — a second, slightly
// transparent sheet behind the front one reads as "requests" without
// needing a hardcoded cutout color for ruled lines.
export function RequestsFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="6" y="2" width="14" height="17" rx="2" opacity="0.5" />
      <rect x="3" y="5" width="14" height="17" rx="2" />
    </svg>
  )
}

// Wheels protrude below the body silhouette (same fill, no inner holes) —
// visible against whatever sits behind the icon instead of a hardcoded
// "cutout" color.
export function VehicleFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4.5 10.5 5.8 6.3A2 2 0 0 1 7.7 5h8.6a2 2 0 0 1 1.9 1.3l1.3 4.2A2.3 2.3 0 0 1 21 12.7v2.8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.8a2.3 2.3 0 0 1 1.5-2.2Z" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  )
}

// Vehicle inventory (distinct from VehicleFilledIcon, which is already used
// for "Vehicle Requests"/sourcing) — same car-body silhouette plus a small
// price-tag badge overlapping the roof, so the two nav rows read as clearly
// different glyphs at a glance rather than near-duplicates.
export function InventoryFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3.5 11.5 4.6 7.8A2 2 0 0 1 6.5 6.5h7.6a2 2 0 0 1 1.9 1.3l1.1 3.4A2.1 2.1 0 0 1 18.5 13.5v2.3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2.3a2.1 2.1 0 0 1 1.5-2Z" />
      <circle cx="6" cy="17.5" r="1.8" />
      <circle cx="15.5" cy="17.5" r="1.8" />
      <path d="M15.5 3.3a2.3 2.3 0 0 1 2.3 0l3 1.75a1 1 0 0 1 0 1.73l-3 1.75a2.3 2.3 0 0 1-2.3 0 2.3 2.3 0 0 1-1.15-2 2.3 2.3 0 0 1 1.15-1.98Z" opacity="0.55" />
    </svg>
  )
}

export function ClientsFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0 1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1Z" />
      <circle cx="17" cy="8.5" r="2.8" opacity="0.55" />
      <path d="M14.7 13.4A6 6 0 0 1 21.5 19a1 1 0 0 1-1 1h-2.3a1 1 0 0 1-1-.86A7.9 7.9 0 0 0 14.7 13.4Z" opacity="0.55" />
    </svg>
  )
}

export function PartsFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.7 7.5a4.3 4.3 0 0 1-5.6 4.9l-6.4 6.4a1.8 1.8 0 0 1-2.5 0l-1-1a1.8 1.8 0 0 1 0-2.5l6.4-6.4A4.3 4.3 0 0 1 16.5 3.3a.6.6 0 0 1 .2 1L14.4 6.6a1.4 1.4 0 0 0 2 2l2.3-2.3a.6.6 0 0 1 1 .2c.13.31.2.65.2 1Z" />
    </svg>
  )
}

export function StatisticsFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <rect x="3.5" y="13" width="4.5" height="8" rx="1.3" />
      <rect x="9.8" y="8" width="4.5" height="13" rx="1.3" />
      <rect x="16" y="3.5" width="4.5" height="17.5" rx="1.3" />
    </svg>
  )
}

// Solid speech-bubble with a punched question mark (the hole is real
// negative space via an SVG mask, not a second hardcoded background color —
// so it still reads correctly on the active item's orange gradient fill).
export function FaqFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  const maskId = 'faq-icon-mask'
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <mask id={maskId}>
        <rect x="0" y="0" width="24" height="24" fill="white" />
        <text x="9.4" y="14.3" fontSize="8.5" fontWeight="700" fill="black" fontFamily="ui-sans-serif, system-ui, sans-serif">
          ?
        </text>
      </mask>
      <path
        d="M12 2.5c5 0 9 3.4 9 7.6 0 4.2-4 7.6-9 7.6a10.3 10.3 0 0 1-2.6-.33L5.6 19.5a.8.8 0 0 1-1.18-.83l.5-3.2A7.1 7.1 0 0 1 3 10.1c0-4.2 4-7.6 9-7.6Z"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

// A solid gear blob (no center hole) — same single-fill, any-background
// rule as the rest of this file.
export function SettingsFilledIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.4 13.1c.04-.36.06-.73.06-1.1s-.02-.74-.06-1.1l2-1.55a.6.6 0 0 0 .14-.76l-1.9-3.3a.6.6 0 0 0-.72-.26l-2.36.95a8.2 8.2 0 0 0-1.9-1.1L14.25 2.5a.6.6 0 0 0-.59-.5h-3.8a.6.6 0 0 0-.6.5l-.35 2.48c-.7.27-1.34.64-1.9 1.1l-2.36-.95a.6.6 0 0 0-.72.26l-1.9 3.3a.6.6 0 0 0 .14.76l2 1.55c-.04.36-.06.73-.06 1.1s.02.74.06 1.1l-2 1.55a.6.6 0 0 0-.14.76l1.9 3.3c.15.26.46.36.72.26l2.36-.95c.56.46 1.2.83 1.9 1.1l.35 2.48a.6.6 0 0 0 .6.5h3.8a.6.6 0 0 0 .59-.5l.35-2.48c.7-.27 1.34-.64 1.9-1.1l2.36.95c.26.1.57 0 .72-.26l1.9-3.3a.6.6 0 0 0-.14-.76Z" />
    </svg>
  )
}
