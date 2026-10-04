import { beforeEach, describe, expect, it, vi } from 'vitest'

const from = vi.hoisted(() => vi.fn())
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from } }))

import { getVehicleTrackingInfo } from '../get-vehicle-tracking-info'

const token = '00000000-0000-4000-8000-000000000002'

function chain(terminal: 'single' | 'order', result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), order: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.maybeSingle.mockResolvedValue(result)
  query.order.mockResolvedValue(result)
  return { query, terminal }
}

beforeEach(() => {
  from.mockReset()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example')
})

describe('getVehicleTrackingInfo public DTO', () => {
  it('returns history and only safe found-vehicle snapshot fields', async () => {
    const request = chain('single', {
      data: {
        id: 'request-id', request_number: 'VR-1', customer_name: 'Awa Ndiaye', created_at: '2026-01-01T00:00:00Z', status: 'vehicle_found',
        preferred_contact_method: 'whatsapp', make: 'Toyota', model: 'RAV4', year_from: 2020, year_to: 2022,
        color: null, engine: null, transmission: null, mileage_min: null, mileage_max: null, trim_level: null,
        budget_min: null, budget_max: null, currency: 'CAD', other_preferences: null,
        admin_notes: 'must never escape',
      }, error: null,
    })
    const history = chain('order', { data: [{ old_status: 'on_treatment', new_status: 'vehicle_found', created_at: '2026-01-02T00:00:00Z' }], error: null })
    const match = chain('single', {
      data: { make: 'Honda', model: 'CR-V', year: 2021, price: 28000, currency: 'CAD', image_bucket: 'inventory-vehicle-photos', image_path: 'cars/crv.jpg', supplier: 'hidden' },
      error: null,
    })
    from.mockImplementation((table: string) => ({ vehicle_requests: request.query, vehicle_request_status_history: history.query, vehicle_request_matches: match.query })[table])

    const result = await getVehicleTrackingInfo(token)
    expect(result?.customerName).toBe('Awa Ndiaye')
    expect(result?.statusHistory).toEqual([{ oldStatus: 'on_treatment', newStatus: 'vehicle_found', createdAt: '2026-01-02T00:00:00Z' }])
    expect(result?.foundVehicle).toEqual({
      make: 'Honda', model: 'CR-V', year: 2021, price: 28000, currency: 'CAD',
      imageUrl: 'https://supabase.example/storage/v1/object/public/inventory-vehicle-photos/cars/crv.jpg',
    })
    expect(JSON.stringify(result)).not.toContain('admin_notes')
    expect(JSON.stringify(result)).not.toContain('supplier')
    expect(JSON.stringify(result)).not.toContain('image_path')
    expect(request.query.select.mock.calls[0][0]).not.toContain('admin_notes')
    expect(request.query.select.mock.calls[0][0]).toContain('customer_name')
    for (const privateColumn of ['customer_email', 'customer_phone', 'whatsapp_phone']) {
      expect(request.query.select.mock.calls[0][0]).not.toContain(privateColumn)
    }
    expect(match.query.select.mock.calls[0][0]).toBe('make, model, year, price, currency, image_bucket, image_path')
  })

  it('does not turn an unexpected stored bucket/path into a customer-visible URL', async () => {
    const request = chain('single', {
      data: {
        id: 'request-id', request_number: 'VR-1', customer_name: 'Awa Ndiaye', created_at: '2026-01-01T00:00:00Z', status: 'vehicle_found',
        preferred_contact_method: 'whatsapp', make: null, model: null, year_from: null, year_to: null,
        color: null, engine: null, transmission: null, mileage_min: null, mileage_max: null, trim_level: null,
        budget_min: null, budget_max: null, currency: 'CAD', other_preferences: null,
      }, error: null,
    })
    const history = chain('order', { data: [], error: null })
    const match = chain('single', {
      data: {
        make: 'Honda', model: 'CR-V', year: 2021, price: null, currency: 'CAD',
        image_bucket: 'private-customer-documents', image_path: '../secret.jpg',
      },
      error: null,
    })
    from.mockImplementation((table: string) => ({ vehicle_requests: request.query, vehicle_request_status_history: history.query, vehicle_request_matches: match.query })[table])

    const result = await getVehicleTrackingInfo(token)
    expect(result?.foundVehicle?.imageUrl).toBeNull()
    expect(JSON.stringify(result)).not.toContain('private-customer-documents')
    expect(JSON.stringify(result)).not.toContain('secret.jpg')
  })
})
