import type { ComponentType } from 'react'

type IconProps = { className?: string }

const shared = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function gearTeeth(cx: number, cy: number, inner: number, outer: number, count: number) {
  const step = 360 / count
  return Array.from({ length: count }, (_, i) => {
    const deg = i * step
    return (
      <line
        key={deg}
        x1={cx}
        y1={cy - outer}
        x2={cx}
        y2={cy - inner}
        transform={`rotate(${deg} ${cx} ${cy})`}
      />
    )
  })
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

export function EngineIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="3.2" />
      {gearTeeth(12, 12, 5, 7, 6)}
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

export function TransmissionIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="9" cy="9" r="2.6" />
      {gearTeeth(9, 9, 3.6, 5, 4)}
      <circle cx="16" cy="16" r="2.6" />
      {gearTeeth(16, 16, 3.6, 5, 4)}
      <path d="M11 10.5l3 3" />
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
  engine: EngineIcon,
  suspension: SuspensionIcon,
  body: BodyIcon,
  electrical: ElectricalIcon,
  cooling: CoolingIcon,
  interior: InteriorIcon,
  transmission: TransmissionIcon,
  filters: FiltersIcon,
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = categoryIcons[name] ?? EngineIcon
  return <Icon className={className} />
}

export function QualityIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export function GlobalIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.2 2.5 13.8 0 16M12 4c-2.5 2.2-2.5 13.8 0 16" />
    </svg>
  )
}

export function FastIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15l4-4" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SupportIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v3a2 2 0 0 0 2 2h1v-6H5a1 1 0 0 0-1 1Z" />
      <path d="M20 13v3a2 2 0 0 1-2 2h-1v-6h1a1 1 0 0 1 1 1Z" />
      <path d="M9 19h3a2 2 0 0 0 2-2" />
    </svg>
  )
}

const trustIcons = [QualityIcon, GlobalIcon, FastIcon, SupportIcon]

export function TrustIcon({ index, className }: { index: number; className?: string }) {
  const Icon = trustIcons[index % trustIcons.length]
  return <Icon className={className} />
}

export function ScanIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" strokeOpacity="0.5" />
    </svg>
  )
}

export function MailIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  )
}

export function PhoneIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M6 3h3l1.5 4.5L8 9a12 12 0 0 0 7 7l1.5-2.5L21 15v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z" />
    </svg>
  )
}

export function WhatsAppIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M7 18l-3 1 1-3a8 8 0 1 1 2 2Z" />
      <path d="M9 10c0 3 2 5 5 5" />
    </svg>
  )
}

export function OtherIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CameraIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  )
}

export function UploadIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M12 15V4M12 4 8 8M12 4l4 4" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function CheckCircleIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  )
}

export function XIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg {...shared} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
