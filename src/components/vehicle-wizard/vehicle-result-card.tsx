import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { BodyIcon } from '@/src/components/home/icons'
import type { ConfirmedVehicle } from './types'

export function VehicleResultCard({
  vehicle,
  dict,
  onConfirm,
  onEditVin,
  onNotMine,
}: {
  vehicle: ConfirmedVehicle
  dict: Dictionary
  onConfirm: () => void
  onEditVin?: () => void
  onNotMine: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)

  const details = (
    [
      vehicle.trim && { label: dict.wizard.result.trimLabel, value: vehicle.trim },
      vehicle.engine && { label: dict.wizard.result.engineLabel, value: vehicle.engine },
      vehicle.transmission && { label: dict.wizard.result.transmissionLabel, value: vehicle.transmission },
      vehicle.bodyStyle && { label: dict.wizard.result.bodyStyleLabel, value: vehicle.bodyStyle },
      vehicle.drivetrain && { label: dict.wizard.result.drivetrainLabel, value: vehicle.drivetrain },
      vehicle.fuelType && { label: dict.wizard.result.fuelTypeLabel, value: vehicle.fuelType },
    ] as const
  ).filter((entry): entry is { label: string; value: string } => Boolean(entry))

  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-6 shadow-md sm:p-8">
      <h2 className="text-xl font-bold tracking-tight">{dict.wizard.result.title}</h2>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
        {vehicle.imageUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.imageUrl}
            alt=""
            onError={() => setImageFailed(true)}
            className="h-28 w-full shrink-0 rounded-xl border border-border bg-surface object-cover sm:w-40"
          />
        ) : (
          <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl border border-border bg-gradient-to-br from-background to-surface text-accent sm:w-40">
            <BodyIcon className="h-12 w-12" />
          </div>
        )}

        <div>
          <p className="text-xl font-bold tracking-tight">
            {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')}
          </p>
          {vehicle.vin && (
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {dict.wizard.result.vinLabel}: {vehicle.vin}
            </p>
          )}
        </div>
      </div>

      {details.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{detail.label}</dt>
              <dd className="mt-0.5 text-sm font-medium">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-6 font-medium">{dict.wizard.result.confirmQuestion}</p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
        >
          {dict.wizard.result.confirm}
        </button>
        {onEditVin && (
          <button
            type="button"
            onClick={onEditVin}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            {dict.wizard.result.editVin}
          </button>
        )}
        <button
          type="button"
          onClick={onNotMine}
          className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:border-accent hover:text-accent"
        >
          {dict.wizard.result.notMine}
        </button>
      </div>
    </div>
  )
}
