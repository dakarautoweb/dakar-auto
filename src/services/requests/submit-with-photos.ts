// Client-side only — posts the request payload plus photos as multipart
// form data to the /api/parts-requests route handler. Kept separate from
// actions.ts because it must run in the browser (it builds a FormData with
// real File objects), unlike the 'use server' action used for the
// no-photos path.
import type { AttachmentType } from '@/src/services/attachments/types'
import type { SubmitPartsRequestInput } from './types'

export type SubmitWithPhotosResult =
  | { ok: true; requestNumber: string; attachments: { uploaded: number; failed: number } }
  | { ok: false; error: string; message?: string }

export async function submitPartsRequestWithPhotos(
  input: SubmitPartsRequestInput,
  photos: { file: File; attachmentType: AttachmentType }[]
): Promise<SubmitWithPhotosResult> {
  const formData = new FormData()
  formData.append('payload', JSON.stringify(input))
  for (const photo of photos) {
    formData.append('photos', photo.file, photo.file.name)
    formData.append('photoTypes', photo.attachmentType)
  }

  try {
    const response = await fetch('/api/parts-requests', { method: 'POST', body: formData })
    return (await response.json()) as SubmitWithPhotosResult
  } catch {
    return { ok: false, error: 'network_error' }
  }
}
