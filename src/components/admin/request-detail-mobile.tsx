import type { ComponentType, ReactNode } from 'react'
import { Eye, Calendar, Tag, Car, Sparkles, Cpu, Settings2, Box, Fuel, Navigation, ScanLine } from 'lucide-react'
import { VehicleImage } from '@/src/components/vehicle-image'

// The below-640px halves of the admin request-detail page's Customer and
// Vehicle cards. They live here rather than inline in the page so the
// mobile layout can be rendered (and screenshotted) in isolation at 320 /
// 375 / 390 / 430px without an admin session or a seeded request. The
// sm+/desktop halves stay inline in the page and are untouched.

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>

// A value long enough that half of a ~248px-wide card (at a 320px viewport)
// would shred it across three lines — those take the full row instead.
const SPAN_THRESHOLD = 18

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size))
  return rows
}

// Label/value pair, no icon — the Customer card's cell. min-w-0 +
// break-words is what stops a long email spilling into the next column.
function FieldCompact({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  if (!value) return null
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[13px] leading-snug font-bold break-words text-foreground">{value}</p>
    </div>
  )
}

// Same rhythm, plus a uniform 20px bare orange icon — the Vehicle card's
// cell. Values wrap rather than truncate, so a decoded string like
// "3.0, Straight 6 Cylinder Engine" gets two lines instead of an ellipsis.
function VehicleFieldCompact({ icon: Icon, label, value }: { icon: IconType; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-[13px] leading-snug font-bold break-words text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function CustomerFieldsMobile({
  labels,
  name,
  phone,
  email,
  preferredContact,
}: {
  labels: { name: string; phone: string; email: string; preferred: string }
  name: string
  phone: string
  email: string
  preferredContact: string
}) {
  return (
    <div className="divide-y divide-border sm:hidden">
      <div className="grid grid-cols-2 gap-x-4 pb-3">
        <FieldCompact label={labels.name} value={name} />
        <FieldCompact label={labels.phone} value={phone} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3">
        <FieldCompact label={labels.email} value={email} className={email.length > SPAN_THRESHOLD ? 'col-span-2' : ''} />
        <FieldCompact label={labels.preferred} value={preferredContact} />
      </div>
    </div>
  )
}

export type MobileVehicle = {
  vin: string | null
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  engine: string | null
  transmission: string | null
  body_style: string | null
  fuel_type: string | null
  drivetrain: string | null
  identification_method: string | null
}

export function VehicleSpecsMobile({
  vehicle,
  labels,
  notProvided,
  imageUrl,
  imageUnavailableLabel,
}: {
  vehicle: MobileVehicle
  labels: {
    vin: string
    year: string
    make: string
    model: string
    trim: string
    engine: string
    transmission: string
    bodyStyle: string
    fuelType: string
    drivetrain: string
    identificationMethod: string
  }
  notProvided: string
  imageUrl: string | null
  imageUnavailableLabel: string
}) {
  const fields = (
    [
      { icon: Calendar, label: labels.year, value: vehicle.year ?? undefined },
      { icon: Tag, label: labels.make, value: vehicle.make ?? undefined },
      { icon: Car, label: labels.model, value: vehicle.model ?? undefined },
      { icon: Sparkles, label: labels.trim, value: vehicle.trim ?? undefined },
      { icon: Cpu, label: labels.engine, value: vehicle.engine ?? undefined },
      { icon: Settings2, label: labels.transmission, value: vehicle.transmission ?? undefined },
      { icon: Box, label: labels.bodyStyle, value: vehicle.body_style ?? undefined },
      { icon: Fuel, label: labels.fuelType, value: vehicle.fuel_type ?? undefined },
      { icon: Navigation, label: labels.drivetrain, value: vehicle.drivetrain ?? undefined },
    ] as Array<{ icon: IconType; label: string; value: string | number | undefined }>
  ).filter((f) => Boolean(f.value))

  return (
    <div className="sm:hidden">
      {/* Pairs are chunked explicitly (Year|Make, Model|Trim, Engine|
          Transmission, Body Style|Fuel Type, ...) so each pair is one row
          <div> and the divider sits under the *whole* row, never between
          two cells of it. */}
      <div className="divide-y divide-border">
        <div className="pb-3">
          <VehicleFieldCompact icon={Eye} label={labels.vin} value={vehicle.vin ?? notProvided} />
        </div>

        {chunk(fields, 2).map((row, i) => {
          // An orphaned last field, or a genuinely long value, takes the
          // full row instead of being crushed into half a 320px card.
          const fullWidth = row.length === 1 || row.some((f) => String(f.value).length > SPAN_THRESHOLD)
          return (
            <div key={i} className={`grid gap-x-4 gap-y-3 py-3 ${fullWidth ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {row.map((f) => (
                <VehicleFieldCompact key={f.label} icon={f.icon} label={f.label} value={f.value} />
              ))}
            </div>
          )
        })}

        {vehicle.identification_method && (
          <div className="pt-3">
            <VehicleFieldCompact icon={ScanLine} label={labels.identificationMethod} value={vehicle.identification_method} />
          </div>
        )}
      </div>

      {/* Its own panel below the specs — fixed height, object-contain, so
          the whole car is visible rather than cropped to fill. */}
      <div className="mt-4 h-48 w-full overflow-hidden rounded-xl border border-border bg-surface">
        <VehicleImage src={imageUrl} className="h-full w-full object-contain" variant="placeholder" placeholderLabel={imageUnavailableLabel} />
      </div>
    </div>
  )
}
