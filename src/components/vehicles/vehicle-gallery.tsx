'use client'

import { useState } from 'react'
import type { VehiclePhoto } from '@/src/services/inventory/types'
import { CarSideIcon } from '@/src/components/home/icons'

export function VehicleGallery({ photos, alt }: { photos: VehiclePhoto[]; alt: string }) {
  const [active, setActive] = useState(0)
  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-border bg-surface">
        <CarSideIcon className="h-16 w-16 text-muted-foreground/50" />
      </div>
    )
  }

  return (
    <div>
      {/* All photos are stacked absolutely and crossfaded via opacity/scale —
          the container keeps its fixed aspect ratio throughout, so switching
          the active photo never shifts layout. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-surface">
        {sorted.map((photo, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- storage-hosted photo, not a static/optimizable asset
          <img
            key={photo.id}
            src={photo.url}
            alt={index === active ? alt : ''}
            aria-hidden={index !== active}
            loading={index === active ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-200 ease-out ${
              index === active ? 'z-10 scale-100 opacity-100' : 'pointer-events-none z-0 scale-[1.03] opacity-0'
            }`}
          />
        ))}
      </div>

      {sorted.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {sorted.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActive(index)}
              aria-current={index === active}
              className={`aspect-[4/3] overflow-hidden rounded-lg border-2 transition duration-200 ${index === active ? 'border-accent' : 'border-transparent opacity-80 hover:opacity-100'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- storage-hosted photo, not a static/optimizable asset */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
