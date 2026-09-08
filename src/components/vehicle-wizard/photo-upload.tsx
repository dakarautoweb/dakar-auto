'use client'

import { useEffect, useRef, useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { UploadIcon, XIcon } from '@/src/components/home/icons'
import { ALLOWED_MIME_TYPES, MAX_FILES, MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import type { AttachmentType } from '@/src/services/attachments/types'
import type { SelectedPhoto } from './types'

const ACCEPT = ALLOWED_MIME_TYPES.join(',')

export function PhotoUpload({
  dict,
  photos,
  onChange,
}: {
  dict: Dictionary
  photos: SelectedPhoto[]
  onChange: (photos: SelectedPhoto[]) => void
}) {
  const t = dict.wizard.partDetails.photos
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Object URLs are only valid for the life of this component/tab — revoke
  // them all on unmount so the browser doesn't hold onto the blobs.
  useEffect(() => {
    return () => {
      for (const photo of photos) URL.revokeObjectURL(photo.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const typeOptions: { value: AttachmentType; label: string }[] = [
    { value: 'part_photo', label: t.typePart },
    { value: 'vehicle_photo', label: t.typeDamage },
    { value: 'vin_photo', label: t.typeVin },
    { value: 'other', label: t.typeOther },
  ]

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
    if (incoming.length === 0) return

    const remainingSlots = MAX_FILES - photos.length
    if (remainingSlots <= 0) {
      setError(t.errorTooMany)
      return
    }

    const accepted: SelectedPhoto[] = []
    let rejected: 'size' | 'type' | 'count' | null = null

    for (const file of incoming) {
      if (accepted.length >= remainingSlots) {
        rejected = 'count'
        break
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
        rejected = 'type'
        continue
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected = 'size'
        continue
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        attachmentType: 'part_photo',
      })
    }

    if (accepted.length > 0) onChange([...photos, ...accepted])

    if (rejected === 'count') setError(t.errorTooMany)
    else if (rejected === 'size') setError(t.errorTooLarge)
    else if (rejected === 'type') setError(t.errorInvalidType)
    else setError(null)
  }

  function handleRemove(id: string) {
    const target = photos.find((p) => p.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(photos.filter((p) => p.id !== id))
    setError(null)
  }

  function handleTypeChange(id: string, attachmentType: AttachmentType) {
    onChange(photos.map((p) => (p.id === id ? { ...p, attachmentType } : p)))
  }

  const atLimit = photos.length >= MAX_FILES

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="block text-sm font-medium text-muted-foreground">{t.title}</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground">{t.optional}</span>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">{t.description}</p>

      {!atLimit && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition ${
            dragActive ? 'border-accent bg-accent-soft' : 'border-border bg-background hover:border-accent'
          }`}
        >
          <UploadIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t.dropHint}</p>
          <span className="mt-1 inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground">
            {t.browse}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-xl border border-border bg-surface/60">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemove(photo.id)}
                  aria-label={t.remove}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <select
                value={photo.attachmentType}
                onChange={(e) => handleTypeChange(photo.id, e.target.value as AttachmentType)}
                className="w-full border-t border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {photos.length}/{MAX_FILES} {t.countLabel}
        </p>
      )}
    </div>
  )
}
