import Link from 'next/link'
import type { ComponentType } from 'react'

export type KpiTone = 'orange' | 'blue' | 'amber' | 'green' | 'purple' | 'red'

// Solid, saturated per-tone fills — bare icon, no icon-well capsule, no
// gradient. A thin inset highlight (not a gradient fill) is what keeps
// these reading as premium plates rather than flat acid-color blocks.
const TONE_STYLES: Record<KpiTone, string> = {
  orange: 'bg-orange-600',
  blue: 'bg-blue-600',
  amber: 'bg-amber-600',
  green: 'bg-emerald-600',
  purple: 'bg-violet-600',
  red: 'bg-red-600',
}

export function KpiCard({
  label,
  value,
  secondary,
  icon: Icon,
  tone,
  href,
}: {
  label: string
  value: number
  secondary: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  tone: KpiTone
  href?: string
}) {
  const className = `group flex flex-col items-center justify-center rounded-2xl border border-white/10 ${TONE_STYLES[tone]} p-6 text-center shadow-card ring-1 ring-inset ring-white/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover hover:brightness-110`

  const content = (
    <>
      <Icon className="h-9 w-9 text-white/90 transition duration-200 group-hover:scale-110" strokeWidth={1.75} />
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-white">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm font-semibold text-white/95">{label}</p>
      <p className="mt-0.5 text-xs text-white/70">{secondary}</p>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
