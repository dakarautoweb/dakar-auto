import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve('supabase/migrations/20260929120000_vehicle_request_matches_history.sql'), 'utf8')

describe('vehicle request match migration', () => {
  it('stores an inventory snapshot rather than relying only on the inventory foreign key', () => {
    expect(migration).toContain('inventory_vehicle_id uuid')
    for (const field of ['make text not null', 'model text not null', 'year integer not null', 'price numeric', 'currency text not null']) {
      expect(migration).toContain(field)
    }
    expect(migration).toContain('select iv.make, iv.model, iv.year, iv.price, iv.currency')
  })

  it('inserts match, status and history inside one atomic database function', () => {
    expect(migration).toContain('admin_update_vehicle_request_status')
    expect(migration).toContain('insert into public.vehicle_request_matches')
    expect(migration).toContain('update public.vehicle_requests')
    expect(migration).toContain('insert into public.vehicle_request_status_history')
  })

  it('allows only admins through RLS and exposes no anon table grant', () => {
    expect(migration).toContain('using (public.is_admin())')
    expect(migration).not.toMatch(/grant select[^;]+\bto anon\b/i)
  })

  it('keeps authenticated access read-only so writes cannot bypass the atomic RPC', () => {
    expect(migration).toContain('grant select on public.vehicle_request_matches to authenticated')
    expect(migration).toContain('grant select on public.vehicle_request_status_history to authenticated')
    expect(migration).toContain('revoke all on public.vehicle_request_matches from anon, authenticated')
    expect(migration).toContain('revoke all on public.vehicle_request_status_history from anon, authenticated')
    expect(migration).not.toMatch(/create policy "Admins can (?:insert|update|delete) vehicle request matches"/i)
    expect(migration).not.toMatch(/create policy "Admins can insert vehicle request status history"/i)
    expect(migration).not.toMatch(/grant[^;]*(?:insert|update|delete)[^;]*vehicle_request_matches[^;]*to authenticated/i)
    expect(migration).not.toMatch(/grant[^;]*insert[^;]*vehicle_request_status_history[^;]*to authenticated/i)
  })

  it('derives the manual-photo bucket and accepts only an existing request-scoped upload path', () => {
    expect(migration).not.toContain('p_manual_image_bucket')
    expect(migration).toContain("v_image_bucket := 'vehicle-request-match-photos'")
    expect(migration).toContain("'^requests/' || p_vehicle_request_id::text")
    expect(migration).toContain('from storage.objects stored_object')
    expect(migration).toContain("stored_object.bucket_id = 'vehicle-request-match-photos'")
  })
})
