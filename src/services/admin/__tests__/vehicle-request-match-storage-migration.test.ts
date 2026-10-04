import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = 'supabase/migrations/20260930120000_vehicle_request_match_photos_storage.sql'
const migration = readFileSync(resolve(migrationPath), 'utf8')

describe('vehicle request match photo storage migration', () => {
  it('creates the expected private bucket', () => {
    expect(migration).toContain("'vehicle-request-match-photos'")
    expect(migration).toMatch(/values\s*\(\s*'vehicle-request-match-photos',\s*'vehicle-request-match-photos',\s*false,/i)
  })

  it('sets the 8 MB size limit and exact image MIME allowlist', () => {
    expect(migration).toContain('8388608')
    expect(migration).toContain("array['image/jpeg', 'image/png', 'image/webp']::text[]")
  })

  it('does not add storage.objects policies for the service-role upload path', () => {
    expect(migration).not.toMatch(/create\s+policy/i)
    expect(migration).not.toMatch(/on\s+storage\.objects/i)
  })
})
