import { beforeEach, describe, expect, it, vi } from 'vitest'

const storageMocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseAdmin: {
    storage: {
      from: storageMocks.from,
    },
  },
}))

import {
  buildManualMatchPhotoPath,
  MATCH_PHOTO_MAX_BYTES,
  MATCH_PHOTO_MIME_TYPES,
  MATCH_PHOTOS_BUCKET,
  MATCH_PHOTOS_BUCKET_PUBLIC,
  safeFoundVehicleImageUrl,
} from './storage'

const requestId = '00000000-0000-4000-8000-000000000001'
const objectId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => {
  storageMocks.createSignedUrl.mockReset().mockResolvedValue({
    data: { signedUrl: 'https://supabase.example/storage/v1/object/sign/vehicle-request-match-photos/photo' },
    error: null,
  })
  storageMocks.from.mockReset().mockReturnValue({ createSignedUrl: storageMocks.createSignedUrl })
})

describe('manual found-vehicle photo storage contract', () => {
  it('uses the expected private bucket, MIME allowlist and 8 MB limit', () => {
    expect(MATCH_PHOTOS_BUCKET).toBe('vehicle-request-match-photos')
    expect(MATCH_PHOTOS_BUCKET_PUBLIC).toBe(false)
    expect(MATCH_PHOTO_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(MATCH_PHOTO_MAX_BYTES).toBe(8 * 1024 * 1024)
  })

  it('generates a request-scoped path with a server-generated object id', () => {
    expect(buildManualMatchPhotoPath(requestId, 'image/webp', objectId)).toBe(
      `requests/${requestId}/${objectId}.webp`
    )
  })

  it('signs a valid private manual-photo reference', async () => {
    const path = buildManualMatchPhotoPath(requestId, 'image/jpeg', objectId)

    await expect(safeFoundVehicleImageUrl({ bucket: MATCH_PHOTOS_BUCKET, path })).resolves.toContain(
      '/storage/v1/object/sign/'
    )
    expect(storageMocks.from).toHaveBeenCalledWith(MATCH_PHOTOS_BUCKET)
    expect(storageMocks.createSignedUrl).toHaveBeenCalledWith(path, 3600)
  })

  it('rejects arbitrary buckets and non-request-scoped manual paths without signing them', async () => {
    const validPath = buildManualMatchPhotoPath(requestId, 'image/png', objectId)

    await expect(safeFoundVehicleImageUrl({ bucket: 'private-customer-documents', path: validPath })).resolves.toBeNull()
    await expect(
      safeFoundVehicleImageUrl({ bucket: MATCH_PHOTOS_BUCKET, path: 'someone-else/secret.png' })
    ).resolves.toBeNull()
    expect(storageMocks.from).not.toHaveBeenCalled()
  })
})
