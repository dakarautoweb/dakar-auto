// Dakar Auto icon system — the single source for every UI glyph on the
// public site (automotive, vehicle specs, actions, contact, status).
//
// One language for all of them: 24×24 grid, outline only, currentColor
// stroke at 1.8, round caps/joins, no baked-in colors — the caller sets the
// tone with text-accent / text-muted-foreground / etc. Every icon is
// decorative (aria-hidden); an icon-only control carries its own
// aria-label.
//
// Size scale (Tailwind classes at the call site):
//   micro 14–16px (h-3.5/h-4) · small 18px (h-[18px]) · normal 20–24px
//   (h-5/h-6) · feature 28–32px (h-7/h-8) · empty state/hero 44–64px
//   (VehicleInventoryIcon, drawn for that range).
//
// Not in here: the multi-tone part illustrations (public/parts/svg via
// CategoryIcon/SubcategoryIcon) and the decorative line-art, which live in
// src/components/home/icons.tsx — that module also re-exports this one so
// existing imports keep working.

import type { ReactNode } from 'react'

export type IconProps = { className?: string }

export const iconBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const

export function gearTeeth(cx: number, cy: number, inner: number, outer: number, count: number) {
  const step = 360 / count
  return Array.from({ length: count }, (_, i) => {
    const deg = i * step
    return <line key={deg} x1={cx} y1={cy - outer} x2={cx} y2={cy - inner} transform={`rotate(${deg} ${cx} ${cy})`} />
  })
}

// =======================================================================
// Automotive
// =======================================================================

// The one side-profile car every side-view vehicle icon is built from: a
// neutral, brand-free modern sedan, front to the right, wheels at y=16.5.
function CarProfile({ dy = 0 }: { dy?: number }) {
  return (
    <g transform={dy ? `translate(0 ${dy})` : undefined}>
      <path d="M4.9 16.5H3.5a1 1 0 0 1-1-1v-2.6a1.5 1.5 0 0 1 1.1-1.45L6 10.8l2.5-2.7a2 2 0 0 1 1.5-.6h3.9a2 2 0 0 1 1.5.7l2.6 2.7 2.7.6a1.5 1.5 0 0 1 1.2 1.47v2.53a1 1 0 0 1-1 1h-1.2" />
      <path d="M9.1 16.5h6.4M6 10.8h12" />
      <circle cx="7" cy="16.5" r="2.1" />
      <circle cx="17.6" cy="16.5" r="2.1" />
    </g>
  )
}

// Front view shared by CarFrontIcon/MakeIcon: wide stance, raked
// windshield, headlights, tyres under the sills. `grille` is the only
// part that differs between the two.
function CarFront({ grille }: { grille: ReactNode }) {
  return (
    <>
      <path d="M5.2 10 6.7 6.1A2 2 0 0 1 8.57 4.8h6.86a2 2 0 0 1 1.87 1.3L18.8 10" />
      <path d="M3.5 12.2A2.2 2.2 0 0 1 5.7 10h12.6a2.2 2.2 0 0 1 2.2 2.2V16a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" />
      <path d="M5.5 17v1.4a.9.9 0 0 0 .9.9h1.2a.9.9 0 0 0 .9-.9V17M15.5 17v1.4a.9.9 0 0 0 .9.9h1.2a.9.9 0 0 0 .9-.9V17" />
      <path d="M6 13.2l2.3.7M18 13.2l-2.3.7" />
      {grille}
    </>
  )
}

export function CarFrontIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <CarFront grille={<path d="M10 14.6h4" />} />
    </svg>
  )
}

export function CarSideIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <CarProfile dy={-1} />
    </svg>
  )
}

// "Make" = the brand: the front view with an emblem on the grille.
export function MakeIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <CarFront grille={<circle cx="12" cy="14" r="1.3" />} />
    </svg>
  )
}

// "Model" = the body: the side profile. Deliberately a different view
// from MakeIcon so the two read apart when they sit side by side.
export const ModelIcon = CarSideIcon

// Taller SUV/estate body — body-style spec, distinct from the sedan
// profile of CarSideIcon.
export function BodyTypeIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4.9 17H3.5a1 1 0 0 1-1-1v-4.2l1.3-4.4a1.5 1.5 0 0 1 1.44-1.1h9.96a1.6 1.6 0 0 1 1.2.55l2.9 3.45 1.5.45a1.6 1.6 0 0 1 1.2 1.55V16a1 1 0 0 1-1 1h-1.3" />
      <path d="M9.1 17h6.4M3 10.3h16.3" />
      <circle cx="7" cy="17" r="2.1" />
      <circle cx="17.6" cy="17" r="2.1" />
    </svg>
  )
}

// Large empty-state / CTA mark (44–64px). Drawn with more detail and a
// lighter stroke than the small glyphs so it doesn't look like a scaled-up
// 16px icon: one clean car with a window pillar, hubs, a headlight and a
// soft ground line.
export function VehicleInventoryIcon({ className = 'h-12 w-12' }: IconProps) {
  return (
    <svg {...iconBase} strokeWidth={1.4} className={className}>
      <g transform="translate(0 -1.5)">
        <path d="M4.6 18.2H3.2a1 1 0 0 1-1-1v-2.9a1.6 1.6 0 0 1 1.2-1.55L6 12.1l2.7-2.9a2 2 0 0 1 1.47-.64h4.2a2 2 0 0 1 1.5.68l2.7 3.06 2.6.55a1.6 1.6 0 0 1 1.27 1.57v2.78a1 1 0 0 1-1 1h-1.2" />
        <path d="M9 18.2h6.84M6 12.1h12.57M12.4 8.7v3.4M20.4 14.3h1.2" />
        <circle cx="6.8" cy="18.2" r="2.2" />
        <circle cx="18.04" cy="18.2" r="2.2" />
        <circle cx="6.8" cy="18.2" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="18.04" cy="18.2" r="0.6" fill="currentColor" stroke="none" />
        <path d="M3.5 22.1h17" strokeOpacity="0.35" />
      </g>
    </svg>
  )
}

// VIN plate — the door-pillar label: a barcode over the printed
// character string, for the VIN field and VIN metadata rows.
export function VINIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M6.5 8v4.5M8.6 8v4.5M11.2 8v4.5M13.2 8v4.5M15.6 8v4.5M17.5 8v4.5" />
      <path d="M6.5 16h.01M9.25 16h.01M12 16h.01M14.75 16h.01M17.5 16h.01" />
    </svg>
  )
}

// Profile car + badge in the free top-right corner — one family for the
// three vehicle actions (find / request / track).
export function VehicleSearchIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <CarProfile dy={2.5} />
      <circle cx="18.6" cy="4.6" r="2.6" />
      <path d="M20.5 6.5 22 8" />
    </svg>
  )
}

export function VehicleRequestIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <CarProfile dy={2.5} />
      <path d="M19 1.8v5.6M16.2 4.6h5.6" />
    </svg>
  )
}

export function VehicleTrackingIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <CarProfile dy={2.5} />
      <path d="M19 9s-3-2.8-3-5a3 3 0 0 1 6 0c0 2.2-3 5-3 5Z" />
      <circle cx="19" cy="4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

// =======================================================================
// Vehicle specs — one set, meant to sit side by side in a spec row/grid
// =======================================================================

export function MileageIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4.64 17.25A8.5 8.5 0 1 1 19.36 17.25" />
      <path d="M5.6 13h1.2M7.5 8.5l.85.85M12 6.6v1.2M16.5 8.5l-.85.85M18.4 13h-1.2" />
      <circle cx="12" cy="13" r="1.4" />
      <path d="M13 12l2.6-2.9M9.8 17.6h4.4" />
    </svg>
  )
}

// Engine block (the dashboard "engine" symbol): oil-cap, block, intake
// on the right, mount on the left — not a gear.
export function EngineSpecIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <g transform="translate(0 .75)">
        <path d="M8.5 4.5h6M11.5 4.5V8" />
        <path d="M7 8h8.5l1.5 2h1.5V8.5H21v8h-2.5V15H17v2a1 1 0 0 1-1 1h-5.7a1 1 0 0 1-.7-.3L7.8 16H7a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
        <path d="M6 12.5H3M3 10.5v4" />
      </g>
    </svg>
  )
}

// Gear-shift gate (H pattern) — reads as "gearbox", not a random cog.
export function TransmissionSpecIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="5" cy="5" r="1.4" />
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="19" cy="5" r="1.4" />
      <circle cx="5" cy="19" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
      <path d="M5 6.4v11.2M12 6.4v11.2M19 6.4V12H5" />
    </svg>
  )
}

// Top-down chassis: four tyres, two axles, driveshaft.
export function DrivetrainSpecIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3" y="3" width="3.6" height="5.6" rx="1.2" />
      <rect x="17.4" y="3" width="3.6" height="5.6" rx="1.2" />
      <rect x="3" y="15.4" width="3.6" height="5.6" rx="1.2" />
      <rect x="17.4" y="15.4" width="3.6" height="5.6" rx="1.2" />
      <path d="M6.6 5.8h10.8M6.6 18.2h10.8M12 5.8v12.4" />
    </svg>
  )
}

export function FuelIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <g transform="translate(1 0)">
        <path d="M4.5 20V5.5A1.5 1.5 0 0 1 6 4h6a1.5 1.5 0 0 1 1.5 1.5V20" />
        <path d="M3 20h12" />
        <rect x="6.8" y="7" width="4.4" height="3.6" rx="0.8" />
        <path d="M13.5 10.5H15a1.5 1.5 0 0 1 1.5 1.5v3.75a1.25 1.25 0 0 0 2.5 0V8.4a1 1 0 0 0-.3-.7L16.5 5.5" />
      </g>
    </svg>
  )
}

export function CalendarIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.8h17M8 3v4M16 3v4" />
      <rect x="7.3" y="13" width="3.4" height="3.4" rx="0.8" />
    </svg>
  )
}

// =======================================================================
// Semantic aliases — same glyph, name that matches the call site. Never a
// second drawing for the same meaning.
// =======================================================================

export const YearIcon = CalendarIcon
export const GaugeIcon = MileageIcon
export const EngineIcon = EngineSpecIcon
export const TransmissionIcon = TransmissionSpecIcon

// =======================================================================
// Actions & navigation
// =======================================================================

export function SearchIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-5-5" />
    </svg>
  )
}

export function ScanIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" strokeOpacity="0.5" />
    </svg>
  )
}

export function CameraIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  )
}

export function UploadIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 15V4M12 4 8 8M12 4l4 4" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

// Landscape-photo glyph — "add photos" labels; distinct from UploadIcon
// (the dropzone's own arrow glyph).
export function ImageIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 17.5 9.5 12.5a1.5 1.5 0 0 1 2.1 0l1.9 1.9M14 14l1.6-1.6a1.5 1.5 0 0 1 2.1 0l1.8 1.8" />
    </svg>
  )
}

export function SendIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M21 3 3 10.5l7.5 3L13.5 21 21 3Z" />
      <path d="M10.5 13.5 21 3" />
    </svg>
  )
}

// Track a request — dotted route between two waypoints.
export function RouteIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="5.5" cy="6" r="2" />
      <circle cx="18.5" cy="18" r="2" />
      <path d="M5.5 8v3a3 3 0 0 0 3 3h7a3 3 0 0 1 3 3" strokeDasharray="2.5 3" />
    </svg>
  )
}

export function EyeIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

// Manual selection / filters — three sliders, distinct from EditIcon.
export function SlidersIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 6h8M16 6h4M4 12h4M12 12h8M4 18h11M19 18h1" />
      <circle cx="14" cy="6" r="2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function RefreshIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

// Counter-clockwise single arrow — "reset filters" / "retry".
export function ResetIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
      <path d="M3.5 3.5v5h5" />
    </svg>
  )
}

export function EditIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function CopyIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  )
}

export function ShareIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
    </svg>
  )
}

export function TrashIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <path d="M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v5.5M14 11v5.5" />
    </svg>
  )
}

export function GridIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}

export function ArrowRightIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  )
}

export function ArrowLeftIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M19 12H6M11 6l-6 6 6 6" />
    </svg>
  )
}

export function ChevronDownIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function ChevronLeftIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export function XIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  )
}

export function OtherIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function WrenchIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M14.2 4.1a5 5 0 0 0-3.9 6.5l-6 6a1.9 1.9 0 0 0 2.7 2.7l6-6a5 5 0 0 0 6.5-3.9l-3 .3-2.2-2.2Z" />
    </svg>
  )
}

export function KeyIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="8" cy="15.5" r="4" />
      <path d="M10.8 12.7 20 3.5M17 6.5l2.5 2.5M14.5 9l2 2" />
    </svg>
  )
}

// =======================================================================
// Contact
// =======================================================================

export function MailIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  )
}

export function PhoneIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M6 3h3l1.5 4.5L8 9a12 12 0 0 0 7 7l1.5-2.5L21 15v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

// Speech bubble with the tail bottom-left and a handset inside — the
// recognisable WhatsApp mark, drawn in this set's outline language.
export function WhatsAppIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M3.5 20.5l1.3-3.9A8.5 8.5 0 1 1 8.2 19.3Z" />
      <path d="M9.4 8.6c-.9.5-1 1.7-.3 3a8 8 0 0 0 3.3 3.3c1.3.7 2.5.6 3-.3M9.4 8.6l.9 1.8M15.4 14.6l-1.8-.9" strokeWidth={1.6} />
    </svg>
  )
}

export function ChatIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.55L3.5 20.5l1.45-4.6A8.5 8.5 0 1 1 20.5 11.5Z" />
      <circle cx="8.3" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="11.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function LocationIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}

// Globe — worldwide sourcing, and "website" in contact lists.
export function GlobalIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.2 2.5 13.8 0 16M12 4c-2.5 2.2-2.5 13.8 0 16" />
    </svg>
  )
}

export const WebsiteIcon = GlobalIcon

// Headset — support / talk to the team.
export function SupportIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v3a2 2 0 0 0 2 2h1v-6H5a1 1 0 0 0-1 1Z" />
      <path d="M20 13v3a2 2 0 0 1-2 2h-1v-6h1a1 1 0 0 1 1 1Z" />
      <path d="M9 19h3a2 2 0 0 0 2-2" />
    </svg>
  )
}

export function InstagramIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function FacebookIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M14 8.5h-1.3c-.7 0-1.2.5-1.2 1.2V11H14l-.3 2H11.5v5.5" />
    </svg>
  )
}

// =======================================================================
// Status — one outline language; semantic color comes from the caller
// (text-emerald-600 / text-accent / text-red-600 / text-blue-600 …).
// =======================================================================

export function CheckCircleIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  )
}

export function ClockIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </svg>
  )
}

// Circle with a half-filled disc — "work under way".
export function InProgressIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7a5 5 0 0 1 0 10Z" fill="currentColor" />
    </svg>
  )
}

export function WarningIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M10.3 4.2 2.8 17.5a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Circle-exclamation — inline form/API errors and alerts.
export function AlertCircleIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v6" />
      <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Circle-cross — a failed / rejected state.
export function ErrorIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  )
}

export function CancelledIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  )
}

export function DraftIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M11 20.5H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h7l4.5 4.5v2.5" />
      <path d="M14 3.5V8h4.5" />
      <path d="M18.4 13.6a1.5 1.5 0 0 1 2.1 2.1L16 20.2l-2.8.7.7-2.8Z" />
    </svg>
  )
}

const SEAL_POINTS = Array.from({ length: 16 }, (_, i) => {
  const r = i % 2 === 0 ? 9.2 : 7.7
  const a = (i * Math.PI) / 8 - Math.PI / 2
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`
}).join(' ')

// Rosette seal with a check — verified / approved.
export function VerifiedIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <polygon points={SEAL_POINTS} />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </svg>
  )
}

export function InfoIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.75" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

export const SuccessIcon = CheckCircleIcon
export const PendingIcon = ClockIcon

// =======================================================================
// Form fields, trust & misc UI
// =======================================================================

// Shield-check — security/trust reassurance and "quality" features.
export function ShieldIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export const QualityIcon = ShieldIcon

export function FastIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15l4-4" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ShippingIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M3 8l9-4 9 4-9 4-9-4Z" />
      <path d="M3 8v8l9 4 9-4V8" />
      <path d="M12 12v8" />
    </svg>
  )
}

export function LayersIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 3l9 5-9 5-9-5 9-5Z" />
      <path d="M3 13l9 5 9-5" strokeOpacity="0.55" />
    </svg>
  )
}

export function HelpIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SunIcon({ className = 'h-[18px] w-[18px]' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
    </svg>
  )
}

export function MoonIcon({ className = 'h-[18px] w-[18px]' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.7 6.7 0 0 0 10.2 10.2Z" />
    </svg>
  )
}

export function PaletteIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 3a9 8 0 1 0 0 16c1 0 1.7-.7 1.7-1.6 0-.4-.2-.8-.4-1.1-.2-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c2.2 0 4-1.6 4-4C20 6 16.4 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PriceTagIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M11.5 4H19a1 1 0 0 1 1 1v7.5a1 1 0 0 1-.3.7l-8 8a1 1 0 0 1-1.4 0l-7-7a1 1 0 0 1 0-1.4l8-8a1 1 0 0 1 .2-.1Z" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </svg>
  )
}

export function NotesIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14.5 3.5V8h4" />
      <path d="M8 12h8M8 15.5h8M8 8.5h3" />
    </svg>
  )
}

// Document-with-wrench — "can't find your part? file a request"; reads as
// an editable request form, not a generic document or a part.
export function RequestToolIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M13.5 3.5V7.5h4" />
      <path d="M7.5 12h4M7.5 15h3" />
      <path d="M16.8 14.2a2 2 0 1 0-2.6 2.6l-3.1 3.1 1 1 3.1-3.1a2 2 0 0 0 1.6-3.6Z" />
    </svg>
  )
}

// Outline package/cube — part details, quantities, "parts found".
export function CubeIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

export function SideArrowsIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M3 12h18" />
      <path d="M7 8l-4 4 4 4" />
      <path d="M17 8l4 4-4 4" />
    </svg>
  )
}

// Cog — "condition" field and "being processed" steps.
export function SettingsGearIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="12" r="3.2" />
      {gearTeeth(12, 12, 7, 9, 8)}
    </svg>
  )
}

export function HashIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M9 3.5 7 20.5M17 3.5l-2 17M4 8.5h16M3 15.5h16" />
    </svg>
  )
}

export function PersonIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </svg>
  )
}

export function IdCardIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <circle cx="8.2" cy="11" r="1.8" />
      <path d="M5.8 15.5a2.6 2.6 0 0 1 4.8 0" />
      <path d="M13.5 9.5h5M13.5 13h5" />
    </svg>
  )
}
