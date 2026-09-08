'use client'

import { useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { XIcon } from '@/src/components/home/icons'

export type GalleryPhoto = {
  id: string
  url: string | null
  fileName: string | null
  attachmentType: string
}

function attachmentTypeLabel(dict: Dictionary, attachmentType: string): string {
  const labels = dict.wizard.partDetails.photos
  switch (attachmentType) {
    case 'part_photo':
      return labels.typePart
    case 'vehicle_photo':
      return labels.typeDamage
    case 'vin_photo':
      return labels.typeVin
    default:
      return labels.typeOther
  }
}

export function PhotoGallery({ dict, photos }: { dict: Dictionary; photos: GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const t = dict.admin.detail

  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.photosEmpty}</p>
  }

  const active = openIndex !== null ? photos[openIndex] : null

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="overflow-hidden rounded-xl border border-border bg-surface/60">
            <button
              type="button"
              onClick={() => photo.url && setOpenIndex(index)}
              disabled={!photo.url}
              className="group relative block aspect-square w-full disabled:cursor-not-allowed"
            >
              {photo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                  {t.photosUnavailable}
                </div>
              )}
            </button>
            <p className="truncate border-t border-border px-2 py-1 text-center text-xs text-muted-foreground">
              {attachmentTypeLabel(dict, photo.attachmentType)}
            </p>
          </div>
        ))}
      </div>

      {active && active.url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label={t.photosSection}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <XIcon className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  )
}
