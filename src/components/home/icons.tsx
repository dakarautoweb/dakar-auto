import type { ComponentType } from 'react'
import { PART_CATEGORY_SVG, PART_SUBCATEGORY_SVG } from '@/src/lib/parts-svg-icons'
import {
  EngineSpecIcon,
  FastIcon,
  GlobalIcon,
  QualityIcon,
  SupportIcon,
  TransmissionSpecIcon,
  DrivetrainSpecIcon,
  BodyTypeIcon,
  gearTeeth,
  iconBase as shared,
  type IconProps,
} from '@/src/components/ui/dakar-icons'

// Every generic UI icon (automotive, specs, actions, contact, status) lives
// in the central Dakar Auto icon system; re-exported here so existing
// `@/src/components/home/icons` imports keep working. This module keeps
// only what is specific to it: the parts illustrations (CategoryIcon /
// SubcategoryIcon and their line-art fallbacks) and decorative art.
export * from '@/src/components/ui/dakar-icons'

// Legacy names for the vehicle result cards' spec grid — same components
// as the central spec set, so the homepage/wizard result cards, the
// inventory cards and the vehicle detail page all share one spec language.
export {
  EngineSpecIcon as ResultEngineIcon,
  BodyTypeIcon as ResultBodyIcon,
  DrivetrainSpecIcon as ResultDrivetrainIcon,
  TransmissionSpecIcon as ResultTransmissionIcon,
}

// Renders a real SVG file from the Dakar Auto icon library (public/parts/
// svg/...) natively — its own baked-in multi-tone colors (a Dakar-orange
// accent shape, light-gray mechanical surface, dark-gray secondary
// surface) stay exactly as drawn, the way a small automotive-part
// illustration should look. This deliberately does NOT go through
// `mask-image`/`currentColor`: masking flattens every file to a single
// silhouette and throws the color detail away, which is the one thing
// CategoryIcon/SubcategoryIcon must not do. Hover/active feedback is a
// brightness/scale nudge applied via the caller's className (see
// SubcategoryTile in parts-browser.tsx) — never a recolor of the artwork
// itself; an active card should signal selection with its own
// border/background, not by tinting the icon orange.
function SvgArtIcon({ src, className = 'h-6 w-6' }: { src: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static asset from public/parts/svg, not an optimizable content image
  return <img src={src} alt="" aria-hidden="true" className={`inline-block shrink-0 object-contain ${className}`} />
}

export function LightingIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="7" cy="12" r="3" />
      <path d="M12 12h8M15 8l3-2M15 16l3 2" />
    </svg>
  )
}

export function BrakingIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SuspensionIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M12 2v3" />
      <path d="M8 6h8" />
      <path d="M9 8l3 1.5L9 11l3 1.5L9 14l3 1.5L9 17" />
      <path d="M8 18h8" />
      <path d="M12 19v3" />
    </svg>
  )
}

export function BodyIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 16l1.5-4.5A2 2 0 0 1 7.4 10h9.2a2 2 0 0 1 1.9 1.5L20 16" />
      <path d="M3 16h18v2a1 1 0 0 1-1 1h-1.5a1.5 1.5 0 0 1-3 0h-7a1.5 1.5 0 0 1-3 0H4a1 1 0 0 1-1-1v-2Z" />
    </svg>
  )
}

export function DrivetrainIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M8 6h8M6 8v8M18 8v8M8 18h8" />
    </svg>
  )
}

export function ElectricalIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CoolingIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 10.4c0-2.5-1-4.4-3-4.4s-1 3 3 4.4Z" />
      <path d="M13.6 12c2.5 0 4.4-1 4.4-3s-3-1-4.4 3Z" />
      <path d="M12 13.6c0 2.5 1 4.4 3 4.4s1-3-3-4.4Z" />
      <path d="M10.4 12c-2.5 0-4.4 1-4.4 3s3 1 4.4-3Z" />
    </svg>
  )
}

export function InteriorIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M7 4h4a1 1 0 0 1 1 1v6H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M7 11h6l3 3v4a1 1 0 0 1-1 1H9l-1-3H6a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

export function FiltersIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 5h16l-6 7v5l-4 2v-7Z" />
    </svg>
  )
}

const categoryIcons: Record<string, ComponentType<IconProps>> = {
  lighting: LightingIcon,
  braking: BrakingIcon,
  engine: EngineSpecIcon,
  suspension: SuspensionIcon,
  body: BodyIcon,
  electrical: ElectricalIcon,
  cooling: CoolingIcon,
  interior: InteriorIcon,
  transmission: TransmissionSpecIcon,
  filters: FiltersIcon,
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const svg = PART_CATEGORY_SVG[name as keyof typeof PART_CATEGORY_SVG]
  if (svg) return <SvgArtIcon src={svg} className={className} />
  const Icon = categoryIcons[name] ?? EngineSpecIcon
  return <Icon className={className} />
}

const trustIcons = [QualityIcon, GlobalIcon, FastIcon, SupportIcon]

export function TrustIcon({ index, className }: { index: number; className?: string }) {
  const Icon = trustIcons[index % trustIcons.length]
  return <Icon className={className} />
}

// Larger decorative line-art — automotive-character accents for section
// backgrounds/watermarks (not photography). Same stroke language as the
// category icon set above, just composed at a bigger, more detailed scale.

export function BrakeDiscArt({ className = 'h-24 w-24' }: IconProps) {
  return (
    <svg {...shared} className={className} strokeWidth={1}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      {Array.from({ length: 8 }, (_, i) => {
        const deg = i * 45
        return <line key={deg} x1="12" y1="5.5" x2="12" y2="7.4" transform={`rotate(${deg} 12 12)`} />
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const deg = i * 72 + 20
        return <circle key={deg} cx={12 + 8.2 * Math.cos((deg * Math.PI) / 180)} cy={12 + 8.2 * Math.sin((deg * Math.PI) / 180)} r="0.5" fill="currentColor" stroke="none" />
      })}
    </svg>
  )
}

// Car + gear + parts-box illustration for the About page's "Ce que nous
// faisons" panel — the only two-tone icon in this file (car outline in a
// muted foreground tone, gear/box in the accent color), since it needs to
// read as a small illustration rather than a flat glyph. Colors are tied to
// the CSS custom properties directly (not currentColor) so both tones stay
// correct regardless of the wrapper's text color.
export function MissionIcon({ className = 'h-20 w-28' }: IconProps) {
  return (
    <svg {...shared} viewBox="0 0 32 22" strokeWidth={1.5} className={className}>
      <g stroke="var(--foreground)" strokeOpacity="0.5">
        <path d="M2 15 5 9a2 2 0 0 1 1.8-1.2h7.4A2 2 0 0 1 16 9l1 6" />
        <path d="M1 15h18v2a1 1 0 0 1-1 1h-1a1.8 1.8 0 0 1-3.6 0H6.6a1.8 1.8 0 0 1-3.6 0H2a1 1 0 0 1-1-1Z" />
        <circle cx="6" cy="12.3" r="0.9" fill="var(--foreground)" fillOpacity="0.5" stroke="none" />
      </g>
      <g stroke="var(--accent)">
        <circle cx="23.5" cy="7" r="3.4" />
        {gearTeeth(23.5, 7, 3.4, 4.6, 8)}
        <circle cx="23.5" cy="7" r="1.2" />
      </g>
      <g stroke="var(--accent)">
        <path d="M19.5 13.5 23.5 11.5 27.5 13.5 27.5 18.5 23.5 20.5 19.5 18.5Z" />
        <path d="M19.5 13.5 23.5 15.5 27.5 13.5M23.5 15.5v5" strokeOpacity="0.7" />
      </g>
    </svg>
  )
}

// Checkered "let's go" flag — used by the About page's closing CTA.
export function FlagIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M6 3v18" />
      <path d="M6 4h12l-2 3 2 3H6Z" />
      <g fill="currentColor" stroke="none">
        <rect x="7.2" y="4.8" width="1.6" height="1.6" />
        <rect x="10.4" y="4.8" width="1.6" height="1.6" />
        <rect x="13.6" y="4.8" width="1.6" height="1.6" fillOpacity="0.45" />
        <rect x="8.8" y="6.4" width="1.6" height="1.6" />
        <rect x="12" y="6.4" width="1.6" height="1.6" />
        <rect x="7.2" y="8" width="1.6" height="1.6" />
        <rect x="10.4" y="8" width="1.6" height="1.6" />
      </g>
    </svg>
  )
}

export function CoilSpringArt({ className = 'h-24 w-24' }: IconProps) {
  return (
    <svg {...shared} className={className} strokeWidth={1}>
      <path d="M6 3h12" />
      <path d="M6 21h12" />
      {Array.from({ length: 7 }, (_, i) => (
        <ellipse key={i} cx="12" cy={4.5 + i * 2.2} rx="6" ry="1.6" />
      ))}
    </svg>
  )
}

export function BatteryArt({ className = 'h-24 w-24' }: IconProps) {
  return (
    <svg {...shared} className={className} strokeWidth={1}>
      <rect x="3" y="7" width="18" height="12" rx="1.5" />
      <path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M8 13h2M11.5 11v4" />
      <path d="M15 13h2" />
    </svg>
  )
}

export function FilterArt({ className = 'h-24 w-24' }: IconProps) {
  return (
    <svg {...shared} className={className} strokeWidth={1}>
      <path d="M5 4h14l-5.5 8v8l-3-1.5v-6.5Z" />
      <path d="M8.2 8.5h7.6" strokeOpacity="0.5" />
    </svg>
  )
}

// -----------------------------------------------------------------------
// Subcategory icons — the second-level parts selector (see
// src/lib/parts-catalog.ts). Same shared stroke language as the top-level
// category icons above (round caps/joins, 1.8 stroke), scaled for smaller
// tiles. Grouped here by real-world part; several subcategory keys reuse
// the same icon where they represent the same physical component (e.g. a
// brake hose and a coolant hose render the same way).
// -----------------------------------------------------------------------

function HeadlightBeamIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 8.5a3.5 3.5 0 0 1 3.5-3.5H9l2 3.5-2 3.5H7.5A3.5 3.5 0 0 1 4 8.5Z" />
      <path d="M12 8.5h8M14 5.5l4-1.5M14 11.5l4 1.5" strokeOpacity="0.6" />
    </svg>
  )
}

function TaillightIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M8 5h8l2 3.5-2 3.5H8l-2-3.5Z" />
      <path d="M8.5 7h7M8.5 10h7" strokeOpacity="0.5" />
    </svg>
  )
}

function TurnSignalIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 9l4 3-4 3" />
    </svg>
  )
}

function BulbIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M9 10a3 3 0 1 1 6 0c0 1.6-1 2.3-1.5 3.3-.3.6-.5 1.1-.5 1.7H10c0-.6-.2-1.1-.5-1.7C9 12.3 9 11.6 9 10Z" />
      <path d="M10 18h4M10.5 20h3" />
    </svg>
  )
}

function ChipModuleIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M9.5 7V4.5M14.5 7V4.5M9.5 20v-2.5M14.5 20v-2.5M7 9.5H4.5M7 14.5H4.5M20 9.5h-2.5M20 14.5h-2.5" />
    </svg>
  )
}

function PlateLightIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="9" width="16" height="6" rx="1.5" />
      <path d="M8 12h8" strokeOpacity="0.5" />
      <path d="M9 6.5l1.2 2M15 6.5l-1.2 2" />
    </svg>
  )
}

function BrakePadIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M7.5 13.5v3M16.5 13.5v3" />
      <path d="M7.5 10.5h9" strokeOpacity="0.5" />
    </svg>
  )
}

function BrakeDiscIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line key={deg} x1="12" y1="6" x2="12" y2="7.6" transform={`rotate(${deg} 12 12)`} />
      ))}
    </svg>
  )
}

function BrakeCaliperIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M7 5h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7Z" />
      <path d="M7 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2" />
      <path d="M10 9h4M10 15h4" />
    </svg>
  )
}

function HoseIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 8c2 0 2 3 4 3s2-3 4-3 2 3 4 3 2-3 4-3" />
      <path d="M4 15c2 0 2 3 4 3s2-3 4-3 2 3 4 3 2-3 4-3" strokeOpacity="0.55" />
    </svg>
  )
}

function SensorProbeIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="9" y="3.5" width="6" height="9" rx="2" />
      <path d="M12 12.5V20M9.5 20h5" />
      <path d="M12 6.5v3" strokeOpacity="0.55" />
    </svg>
  )
}

function MasterCylinderIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="9" width="10" height="6" rx="1.5" />
      <path d="M14 11h3a1 1 0 0 1 1 1v2M18 11.5v3" />
      <path d="M7 9V6.5M11 9V6.5" />
    </svg>
  )
}

function BoosterIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M6 12a6 6 0 0 1 12 0v3H6Z" />
      <path d="M12 15v5M9.5 20h5" />
    </svg>
  )
}

function ParkingBrakeIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M6 20V5a1 1 0 0 1 1-1h2v16" />
      <path d="M9 7h6l-2 2M9 11h4" />
    </svg>
  )
}

function FluidDropIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M12 4c3 4 5.5 7.4 5.5 10.2A5.5 5.5 0 0 1 6.5 14.2C6.5 11.4 9 8 12 4Z" />
      <path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" strokeOpacity="0.55" />
    </svg>
  )
}

function EngineBlockIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="5" y="9" width="10" height="9" rx="1.2" />
      <path d="M8 9V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M15 12h4v4h-4" />
      <path d="M8 13h4" strokeOpacity="0.5" />
    </svg>
  )
}

function TimingChainIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="8" cy="9" r="3" />
      <circle cx="16" cy="15" r="3" />
      <path d="M10.2 7.2a8 8 0 0 1 3.6 3.6M13.8 16.8a8 8 0 0 1-3.6-3.6" strokeOpacity="0.55" />
    </svg>
  )
}

function BeltLoopIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="8" cy="15" r="3" />
      <circle cx="16" cy="9" r="3" />
      <path d="M9.8 12.8 14.2 11.2M6.2 17.2A6 6 0 0 1 8 5M17.8 6.8A6 6 0 0 1 16 19" strokeOpacity="0.55" />
    </svg>
  )
}

function GasketRingIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="4" />
      {[0, 90, 180, 270].map((deg) => (
        <circle key={deg} cx={12 + 5.7 * Math.cos((deg * Math.PI) / 180)} cy={12 + 5.7 * Math.sin((deg * Math.PI) / 180)} r="0.5" fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

function MountBracketIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 15V9a2 2 0 0 1 2-2h6l6 6" />
      <circle cx="7.5" cy="16.5" r="2" />
      <circle cx="17" cy="16.5" r="2" />
    </svg>
  )
}

function FuelPumpIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="5" y="6" width="8" height="14" rx="1" />
      <path d="M13 10h2.5l2.5 2.5V17a1.5 1.5 0 0 1-3 0" />
      <path d="M7.5 9h3" strokeOpacity="0.5" />
    </svg>
  )
}

function SparkPlugIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M10 3h4v5h-4Z" />
      <path d="M9 8h6v4a3 3 0 0 1-3 3 3 3 0 0 1-3-3Z" />
      <path d="M12 15v3M10 21h4l-1-3h-2Z" />
    </svg>
  )
}

function OilCanIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M6 10a2 2 0 0 1 2-2h5l3-2 1 1-2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z" />
      <path d="M9 12v4" strokeOpacity="0.5" />
    </svg>
  )
}

function ShockAbsorberIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M9 3v7M15 21v-7" />
      <rect x="8" y="9" width="8" height="7" rx="1.5" />
      <path d="M9 3h6M9 21h6" strokeOpacity="0.6" />
    </svg>
  )
}

function SpringIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 4h14" />
      <path d="M5 20h14" />
      {Array.from({ length: 6 }, (_, i) => (
        <ellipse key={i} cx="12" cy={5.5 + i * 2.6} rx="5.5" ry="1.4" />
      ))}
    </svg>
  )
}

function ControlArmIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 17 11 7h8" />
      <circle cx="5" cy="17" r="1.7" />
      <circle cx="11" cy="7" r="1.7" />
      <circle cx="19" cy="7" r="1.7" />
    </svg>
  )
}

function BallJointIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M12 4v6" />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M9.5 18h5l-1 3h-3Z" />
    </svg>
  )
}

function BushingIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.2" strokeWidth="2.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="7.4"
          x2="12"
          y2="4.9"
          strokeOpacity="0.55"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  )
}

function TieRodIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 17 17 5" />
      <path d="M4 18l2 2M16 4l2 2" />
      <circle cx="6.5" cy="17.5" r="1.4" />
      <circle cx="17.5" cy="6.5" r="1.4" />
    </svg>
  )
}

function StabilizerLinkIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M7 6v5.5L17 14v3.5" />
      <circle cx="7" cy="6" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </svg>
  )
}

function WheelHubIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      {[0, 72, 144, 216, 288].map((deg) => (
        <circle key={deg} cx={12 + 4 * Math.cos((deg * Math.PI) / 180)} cy={12 + 4 * Math.sin((deg * Math.PI) / 180)} r="0.7" fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

function BumperBarIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 13c1-4 4-6 8-6s7 2 8 6" />
      <path d="M4 13v2.5h16V13" strokeOpacity="0.6" />
    </svg>
  )
}

function FenderIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M4 16h16" />
      <circle cx="12" cy="16" r="3.2" strokeOpacity="0.55" />
    </svg>
  )
}

function HoodPanelIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M3 16 6 7h12l3 9Z" />
      <path d="M8 16 9.5 8.5M16 16 14.5 8.5" strokeOpacity="0.5" />
    </svg>
  )
}

function DoorIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="6" y="3.5" width="12" height="17" rx="1.5" />
      <path d="M14.5 12h.01" strokeWidth="2.5" />
    </svg>
  )
}

function MirrorIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 9a3 3 0 0 1 3-3h4l3 3-3 3H8a3 3 0 0 1-3-3Z" />
      <path d="M15 9h4" strokeOpacity="0.55" />
    </svg>
  )
}

function GrilleIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="M4 9.5h16M4 13h16M4 16.5h16" strokeOpacity="0.5" />
    </svg>
  )
}

function TrunkIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M3 12 12 6l9 6" />
      <path d="M4.5 12h15v5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

function TrimStripIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 15c2-6 4-9 8-9s6 3 8 9" />
      <path d="M4 15h16" strokeOpacity="0.55" />
    </svg>
  )
}

function BatterySmallIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="8" width="16" height="10" rx="1.5" />
      <path d="M8.5 8V6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2" />
      <path d="M9 13h2M13 13h2M11 11v4" />
    </svg>
  )
}

function AlternatorIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="7" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line key={deg} x1="12" y1="7.5" x2="12" y2="8.8" transform={`rotate(${deg} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  )
}

function StarterIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="10" width="10" height="6" rx="1.5" />
      <path d="M14 12h3.5a2.5 2.5 0 0 1 0 5H14" />
      <circle cx="7.5" cy="8" r="1.6" strokeOpacity="0.6" />
    </svg>
  )
}

function WiringIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 6c4 0 4 4.5 8 4.5S16 6 20 6" />
      <path d="M4 12c4 0 4 4.5 8 4.5S16 12 20 12" strokeOpacity="0.6" />
      <path d="M4 18h16" strokeOpacity="0.35" />
    </svg>
  )
}

function FuseIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="8" y="4" width="8" height="16" rx="3" />
      <path d="M10.5 9v6M13.5 9v6" strokeOpacity="0.55" />
    </svg>
  )
}

function SwitchIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="5" y="8" width="14" height="8" rx="4" />
      <circle cx="15" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HornIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M5 10.5a7 7 0 0 1 7-7v14a7 7 0 0 1-7-7Z" />
      <path d="M12 5.5 19 3v13l-7-2.5" strokeOpacity="0.6" />
    </svg>
  )
}

function RadiatorIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
      <path d="M8.3 5v14M11.6 5v14M14.9 5v14" strokeOpacity="0.5" />
    </svg>
  )
}

function FanBladeIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 10.4c0-2.5-1-4.4-3-4.4s-1 3 3 4.4Z" />
      <path d="M13.6 12c2.5 0 4.4-1 4.4-3s-3-1-4.4 3Z" />
      <path d="M12 13.6c0 2.5 1 4.4 3 4.4s1-3-3-4.4Z" />
      <path d="M10.4 12c-2.5 0-4.4 1-4.4 3s3 1 4.4-3Z" />
      <circle cx="12" cy="12" r="8.5" strokeOpacity="0.3" />
    </svg>
  )
}

function WaterPumpIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="10.5" cy="12" r="5" />
      <path d="M10.5 9v6M8 10.5l5 3M8 13.5l5-3" strokeOpacity="0.55" />
      <path d="M15.5 12H20" />
    </svg>
  )
}

function ThermostatIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="7" />
      <path d="M8.5 12h7M12 8.5v7" strokeOpacity="0.55" />
      <path d="M9 15l6-6" />
    </svg>
  )
}

function ExpansionTankIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M7 5h10v3l2 2v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9l2-2Z" />
      <path d="M6 14h12" strokeOpacity="0.5" />
    </svg>
  )
}

function RadiatorCapIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="13" r="6" />
      <path d="M8 8l-1.5-2M16 8l1.5-2M12 6.5V4" />
    </svg>
  )
}

function CoolerFinsIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="7" width="16" height="10" rx="1.5" />
      <path d="M7 7v10M10 7v10M13 7v10M16 7v10" strokeOpacity="0.5" />
    </svg>
  )
}

function SeatIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M7 4h4a1 1 0 0 1 1 1v6H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M7 11h6l3 3v4a1 1 0 0 1-1 1H9l-1-3H6a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

function SeatBeltIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M6 3l12 18" />
      <rect x="9.5" y="10.5" width="5" height="4" rx="1" transform="rotate(33 12 12.5)" />
    </svg>
  )
}

function DashboardIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M3 15c1-6 5-9 9-9s8 3 9 9" />
      <circle cx="8.5" cy="14" r="2" strokeOpacity="0.6" />
      <circle cx="15.5" cy="14" r="2" strokeOpacity="0.6" />
    </svg>
  )
}

function ConsoleIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M7 20 9 6h6l2 14Z" />
      <rect x="9.7" y="9.5" width="4.6" height="3" rx="0.6" strokeOpacity="0.6" />
    </svg>
  )
}

function SteeringWheelIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 6.5v3.5M7 15.5l3.2-2.3M17 15.5l-3.2-2.3" />
    </svg>
  )
}

function CarpetIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M7.5 5v14M11 5v14M14.5 5v14" strokeOpacity="0.45" />
    </svg>
  )
}

function GearboxIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="9" width="9" height="7" rx="1.5" />
      <circle cx="16.5" cy="12.5" r="3.5" />
      {[0, 90, 180, 270].map((deg) => (
        <line key={deg} x1="16.5" y1="8.2" x2="16.5" y2="9.4" transform={`rotate(${deg} 16.5 12.5)`} />
      ))}
    </svg>
  )
}

function ClutchDiscIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line key={deg} x1="12" y1="5.5" x2="12" y2="6.7" transform={`rotate(${deg} 12 12)`} strokeOpacity="0.6" />
      ))}
    </svg>
  )
}

function TorqueConverterIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" strokeOpacity="0.5" />
      <path d="M12 4v4M12 16v4" />
    </svg>
  )
}

function SolenoidIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="6" y="5" width="8" height="14" rx="2" />
      <path d="M8.5 8h3M8.5 11h3M8.5 14h3" strokeOpacity="0.55" />
      <path d="M14 10h4v4h-4" />
    </svg>
  )
}

function ValveBodyIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
      <path d="M8 6v12M12 6v12M16 6v12" strokeOpacity="0.5" />
    </svg>
  )
}

function AxleIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 12h4l3-3h2l3 3h4" />
      <circle cx="8" cy="12" r="2.3" strokeOpacity="0.6" />
      <circle cx="16" cy="12" r="2.3" strokeOpacity="0.6" />
    </svg>
  )
}

function DriveshaftIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M3 16 9 8h6l6 8" />
      <circle cx="9" cy="8" r="1.6" />
      <circle cx="15" cy="8" r="1.6" />
    </svg>
  )
}

function AirFilterIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 6h16v4l-7 8H8L4 10Z" />
      <path d="M4 6l7 8M20 6l-7 8" strokeOpacity="0.4" />
    </svg>
  )
}

function CylinderFilterIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M8 4h8l1 4v9a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V8Z" />
      <path d="M8.5 9h7M8.5 12h7" strokeOpacity="0.5" />
    </svg>
  )
}

// Generic parts / plus icon for each category's "Other" subcategory tile —
// deliberately distinct from OtherIcon (the three-dot "…" used for the
// top-level "can't find your category" tile) so the two affordances read
// differently at a glance.
export function OtherPartIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" strokeDasharray="3 2.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  )
}

const subcategoryIcons: Record<string, ComponentType<IconProps>> = {
  headlights: HeadlightBeamIcon,
  taillights: TaillightIcon,
  'fog-lights': HeadlightBeamIcon,
  'turn-signals': TurnSignalIcon,
  bulbs: BulbIcon,
  'led-modules': ChipModuleIcon,
  'light-control-modules': ChipModuleIcon,
  'license-plate-lights': PlateLightIcon,

  'brake-pads': BrakePadIcon,
  'brake-rotors': BrakeDiscIcon,
  'brake-calipers': BrakeCaliperIcon,
  'brake-hoses': HoseIcon,
  'abs-sensors': SensorProbeIcon,
  'master-cylinder': MasterCylinderIcon,
  'brake-booster': BoosterIcon,
  'parking-brake': ParkingBrakeIcon,
  'brake-fluid-hardware': FluidDropIcon,

  'engine-assembly': EngineBlockIcon,
  'timing-parts': TimingChainIcon,
  'belts-tensioners': BeltLoopIcon,
  'gaskets-seals': GasketRingIcon,
  'engine-mounts': MountBracketIcon,
  'fuel-system-parts': FuelPumpIcon,
  'ignition-parts': SparkPlugIcon,
  'engine-sensors': SensorProbeIcon,
  'oil-system-parts': OilCanIcon,

  'shock-absorbers': ShockAbsorberIcon,
  struts: ShockAbsorberIcon,
  springs: SpringIcon,
  'control-arms': ControlArmIcon,
  'ball-joints': BallJointIcon,
  bushings: BushingIcon,
  'tie-rods': TieRodIcon,
  'stabilizer-links': StabilizerLinkIcon,
  'wheel-hubs-bearings': WheelHubIcon,

  'front-bumper': BumperBarIcon,
  'rear-bumper': BumperBarIcon,
  fenders: FenderIcon,
  hood: HoodPanelIcon,
  doors: DoorIcon,
  mirrors: MirrorIcon,
  grilles: GrilleIcon,
  'trunk-tailgate': TrunkIcon,
  'body-trim': TrimStripIcon,

  battery: BatterySmallIcon,
  alternator: AlternatorIcon,
  starter: StarterIcon,
  'wiring-harnesses': WiringIcon,
  'fuses-relays': FuseIcon,
  switches: SwitchIcon,
  sensors: SensorProbeIcon,
  'control-modules': ChipModuleIcon,
  horns: HornIcon,

  radiator: RadiatorIcon,
  'cooling-fan': FanBladeIcon,
  'water-pump': WaterPumpIcon,
  thermostat: ThermostatIcon,
  'coolant-hoses': HoseIcon,
  'expansion-tank': ExpansionTankIcon,
  'radiator-cap': RadiatorCapIcon,
  'temperature-sensors': SensorProbeIcon,
  'oil-transmission-cooler': CoolerFinsIcon,

  seats: SeatIcon,
  'seat-belts': SeatBeltIcon,
  'dashboard-parts': DashboardIcon,
  'center-console': ConsoleIcon,
  'steering-wheel': SteeringWheelIcon,
  'door-panels': DoorIcon,
  'interior-trim': TrimStripIcon,
  'window-switches': SwitchIcon,
  'floor-mats-carpets': CarpetIcon,

  'gearbox-assembly': GearboxIcon,
  clutch: ClutchDiscIcon,
  'torque-converter': TorqueConverterIcon,
  'transmission-mount': MountBracketIcon,
  'transmission-filter': CylinderFilterIcon,
  'shift-solenoids': SolenoidIcon,
  'valve-body': ValveBodyIcon,
  'cv-axles': AxleIcon,
  driveshaft: DriveshaftIcon,

  'engine-air-filter': AirFilterIcon,
  'cabin-air-filter': AirFilterIcon,
  'oil-filter': CylinderFilterIcon,
  'fuel-filter': CylinderFilterIcon,
  'hydraulic-filter': CylinderFilterIcon,
  'filter-housing': AirFilterIcon,
  'filter-kits': AirFilterIcon,
}

export function SubcategoryIcon({ name, className }: { name: string; className?: string }) {
  const svg = PART_SUBCATEGORY_SVG[name]
  if (svg) return <SvgArtIcon src={svg} className={className} />
  const Icon = subcategoryIcons[name] ?? OtherPartIcon
  return <Icon className={className} />
}

