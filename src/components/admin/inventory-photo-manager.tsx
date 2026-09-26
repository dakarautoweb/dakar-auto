'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, ImagePlus, Images, Star, Trash2 } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { VehiclePhoto } from '@/src/services/inventory/types'
import { deletePhotoAction, moveVehiclePhotoAction, setPrimaryPhotoAction, uploadVehiclePhotosAction } from '@/src/services/inventory/photo-actions'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'

// Rendered only on the edit page (a vehicle needs to exist before a photo
// row can reference it via vehicle_id) — see inventory-form.tsx's
// `photosHint` shown on the create page instead of this component.
export function InventoryPhotoManager({ dict, vehicleId, photos }: { dict: Dictionary; vehicleId: string; photos: VehiclePhoto[] }) {
  const t = dict.admin.inventoryPage.photos
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, startUpload] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const formData = new FormData()
    for (const file of Array.from(files)) formData.append('photos', file)

    setError(null)
    startUpload(async () => {
      const result = await uploadVehiclePhotosAction(vehicleId, formData)
      if (result.ok) router.refresh()
      else setError(t.errorUploadFailed)
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  function move(photoId: string, direction: 'up' | 'down') {
    setBusyId(photoId)
    setError(null)
    startTransition(async () => {
      const result = await moveVehiclePhotoAction(photoId, vehicleId, direction)
      if (result.ok) router.refresh()
      else setError(t.errorActionFailed)
      setBusyId(null)
    })
  }

  function makePrimary(photoId: string) {
    setBusyId(photoId)
    setError(null)
    startTransition(async () => {
      const result = await setPrimaryPhotoAction(photoId, vehicleId)
      if (result.ok) router.refresh()
      else setError(t.errorActionFailed)
      setBusyId(null)
    })
  }

  function remove(photoId: string) {
    if (!window.confirm(t.deleteConfirmBody)) return
    setBusyId(photoId)
    setError(null)
    startTransition(async () => {
      const result = await deletePhotoAction(photoId, vehicleId)
      if (result.ok) router.refresh()
      else setError(t.errorActionFailed)
      setBusyId(null)
    })
  }

  const busy = pending || uploading

  return (
    <div className={cardClasses({ padding: 'md' })}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Images className="h-4 w-4" strokeWidth={2} />
          </span>
          <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">{t.title}</h2>
        </div>
        <label className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'cursor-pointer gap-1.5' })}>
          <ImagePlus className="h-4 w-4" strokeWidth={2} />
          {uploading ? t.uploading : t.uploadButton}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFilesSelected} disabled={busy} className="hidden" />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {sorted.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <Images className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((photo, index) => (
            <div key={photo.id} className="relative overflow-hidden rounded-xl border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- storage-hosted photo, not a static/optimizable asset */}
              <img src={photo.url} alt="" className="aspect-[4/3] w-full object-cover" />

              {photo.isPrimary && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  <Star className="h-3 w-3" strokeWidth={2} fill="currentColor" />
                  {t.primary}
                </span>
              )}

              <div className="flex items-center justify-between gap-1 border-t border-border bg-card p-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(photo.id, 'up')}
                    disabled={busy || index === 0}
                    aria-label={t.moveUp}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition duration-200 hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(photo.id, 'down')}
                    disabled={busy || index === sorted.length - 1}
                    aria-label={t.moveDown}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition duration-200 hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  {!photo.isPrimary && (
                    <button
                      type="button"
                      onClick={() => makePrimary(photo.id)}
                      disabled={busy}
                      title={t.makePrimary}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition duration-200 hover:bg-accent-soft hover:text-accent"
                    >
                      <Star className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  disabled={busy}
                  aria-label={dict.admin.inventoryPage.delete}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition duration-200 hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
