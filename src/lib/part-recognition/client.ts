import type { Locale } from '@/src/i18n/config'
import type { PartRecognitionErrorCode, PartRecognitionResponse, PartRecognitionResult, RecognitionVehicleContext } from './types'

// Browser-side call to POST /api/part-recognition. The OpenAI key never
// reaches the browser — this only talks to our own route.

export type ClientRecognitionOutcome =
  | { ok: true; result: PartRecognitionResult }
  | { ok: false; error: PartRecognitionErrorCode | 'network' | 'aborted' }

// Phone photos are often several MB; hosting platforms cap request bodies
// (4.5 MB on Vercel) and a smaller image is also cheaper to analyze.
// Anything above this is re-encoded to a JPEG no larger than MAX_EDGE px.
const DOWNSCALE_ABOVE_BYTES = 3 * 1024 * 1024
const MAX_EDGE = 2048

async function prepareImage(file: File): Promise<Blob> {
  if (file.size <= DOWNSCALE_ABOVE_BYTES || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob && blob.size < file.size ? blob : file
  } catch {
    // Decoding failed — send the original and let the server validate it.
    return file
  }
}

export async function requestPartRecognition(
  file: File,
  { locale, vehicle }: { locale: Locale; vehicle: RecognitionVehicleContext | null },
  signal: AbortSignal,
): Promise<ClientRecognitionOutcome> {
  try {
    const image = await prepareImage(file)
    const form = new FormData()
    form.append('image', image, image === file ? file.name : 'photo.jpg')
    form.append('locale', locale)
    if (vehicle) {
      if (vehicle.year) form.append('year', String(vehicle.year))
      if (vehicle.make) form.append('make', vehicle.make)
      if (vehicle.model) form.append('model', vehicle.model)
      if (vehicle.engine) form.append('engine', vehicle.engine)
    }

    const response = await fetch('/api/part-recognition', { method: 'POST', body: form, signal })
    // A platform-level 413 (body over the host's limit) has no JSON body.
    if (response.status === 413) return { ok: false, error: 'too_large' }
    const body = (await response.json().catch(() => null)) as PartRecognitionResponse | null
    if (!body || typeof body.ok !== 'boolean') return { ok: false, error: 'provider_error' }
    return body
  } catch (error) {
    if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return { ok: false, error: 'aborted' }
    return { ok: false, error: 'network' }
  }
}
