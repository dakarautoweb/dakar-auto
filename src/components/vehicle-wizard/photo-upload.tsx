'use client'

import { useRef, useState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { UploadIcon, XIcon } from '@/src/components/home/icons'
import { ALLOWED_MIME_TYPES, MAX_FILES, MAX_FILE_SIZE_BYTES } from '@/src/services/attachments/constants'
import { requestUploadUrl } from '@/src/services/attachments/request-upload-url'
import { uploadPhotoDirect } from '@/src/services/attachments/upload-client'
import { deletePendingUpload } from '@/src/services/attachments/delete-pending'
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
  // Accepts the functional-update form (like a real useState setter) so
  // async upload callbacks (startUpload, XHR progress events) can always
  // patch off the latest state instead of a snapshot captured when the
  // callback was created.
  onChange: (update: SelectedPhoto[] | ((prev: SelectedPhoto[]) => SelectedPhoto[])) => void
}) {
  const t = dict.wizard.partDetails.photos
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Chains successive requestUploadUrl() calls into one upload session
  // (see request-upload-url.ts) — a plain ref since it's write-once-per-call
  // and never drives a render itself.
  const sessionTokenRef = useRef<string | null>(null)

  // Deliberately NOT revoking every previewUrl on unmount here: `photos`
  // (and its object URLs) are owned by VehicleWizard, not this component —
  // this step (and the whole Part Details form) unmounts every time the
  // user moves on to Contact/Review and remounts on "Edit" from Review,
  // while the SAME photos list keeps flowing through to the Review step's
  // thumbnails. Revoking here used to invalidate those blob: URLs the
  // moment the user left this step, so Review rendered broken images even
  // though the exact same File objects were still sitting in state. The
  // owner (VehicleWizard) revokes them once, when the whole wizard itself
  // unmounts — see the effect there. A photo removed via handleRemove below
  // is still revoked immediately, since that one is gone for good.

  const typeOptions: { value: AttachmentType; label: string }[] = [
    { value: 'part_photo', label: t.typePart },
    { value: 'vehicle_photo', label: t.typeDamage },
    { value: 'vin_photo', label: t.typeVin },
    { value: 'other', label: t.typeOther },
  ]

  function patchPhoto(id: string, patch: Partial<SelectedPhoto>) {
    onChange((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  async function startUpload(photo: SelectedPhoto) {
    patchPhoto(photo.id, { status: 'uploading', progress: 0 })

    const result = await requestUploadUrl({
      sessionToken: sessionTokenRef.current,
      fileName: photo.file.name,
      declaredMime: photo.file.type,
      declaredSize: photo.file.size,
      attachmentType: photo.attachmentType,
    })

    if (!result.ok) {
      patchPhoto(photo.id, { status: 'failed', progress: 0 })
      return
    }

    sessionTokenRef.current = result.sessionToken

    const upload = await uploadPhotoDirect(photo.file, result.signedUrl, (percent) => {
      patchPhoto(photo.id, { progress: percent })
    })

    if (!upload.ok) {
      patchPhoto(photo.id, { status: 'failed', progress: 0 })
      return
    }

    patchPhoto(photo.id, { status: 'uploaded', progress: 100, fileToken: result.fileToken })
  }

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
        status: 'uploading',
        progress: 0,
        fileToken: null,
      })
    }

    if (accepted.length > 0) {
      onChange([...photos, ...accepted])
      for (const photo of accepted) startUpload(photo)
    }

    if (rejected === 'count') setError(t.errorTooMany)
    else if (rejected === 'size') setError(t.errorTooLarge)
    else if (rejected === 'type') setError(t.errorInvalidType)
    else setError(null)
  }

  function handleRemove(id: string) {
    const target = photos.find((p) => p.id === id)
    if (target) {
      URL.revokeObjectURL(target.previewUrl)
      if (target.fileToken) deletePendingUpload(target.fileToken)
    }
    onChange(photos.filter((p) => p.id !== id))
    setError(null)
  }

  function handleRetry(id: string) {
    const target = photos.find((p) => p.id === id)
    if (target) startUpload(target)
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
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition duration-200 ${
            dragActive ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-accent'
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
            <div key={photo.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <div className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />

                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 text-white">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                    <span className="text-xs font-medium">{t.uploading} {photo.progress}%</span>
                  </div>
                )}

                {photo.status === 'failed' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-red-900/70 p-2 text-center text-white">
                    <span className="text-xs font-medium">{t.uploadFailed}</span>
                    <button
                      type="button"
                      onClick={() => handleRetry(photo.id)}
                      className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition duration-200 hover:bg-white/25"
                    >
                      {t.retry}
                    </button>
                  </div>
                )}

                {photo.status === 'uploaded' && (
                  <span className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                      <path d="M8 12.5l2.5 2.5L16 9.5" />
                    </svg>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(photo.id)}
                  aria-label={t.remove}
                  className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition duration-200 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
              <select
                value={photo.attachmentType}
                onChange={(e) => handleTypeChange(photo.id, e.target.value as AttachmentType)}
                className="w-full border-t border-border bg-surface px-2 py-1.5 text-xs text-foreground transition duration-200 focus:outline-none"
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
