import { beforeEach, describe, expect, it, vi } from 'vitest'

const from = vi.hoisted(() => vi.fn())
vi.mock('@/src/lib/supabase/server', () => ({ supabaseAdmin: { from } }))

import { getTrackingInfo } from '../get-tracking-info'

const token = '00000000-0000-4000-8000-000000000001'

function query(result: unknown) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    order: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.maybeSingle.mockResolvedValue(result)
  chain.order.mockResolvedValue(result)
  return chain
}

beforeEach(() => from.mockReset())

describe('getTrackingInfo public DTO', () => {
  it('returns the existing full customer_name plus parts and history, without private fields', async () => {
    const request = query({
      data: {
        id: 'internal-request-id',
        request_number: 'DA-2026-000123',
        customer_name: 'Awa Ndiaye',
        customer_email: 'awa@example.test',
        customer_phone: '+221770000000',
        whatsapp_phone: '+221770000000',
        admin_notes: 'internal only',
        created_at: '2026-09-30T12:00:00Z',
        status: 'parts_found',
        preferred_contact_method: 'whatsapp',
        vehicles: { year: 2021, make: 'Toyota', model: 'RAV4' },
        parts_request_items: [
          { category: 'engine', part_name: 'Alternator', quantity: 1, condition_preference: 'oem', description: null },
        ],
      },
      error: null,
    })
    const history = query({
      data: [{ old_status: 'on_treatment', new_status: 'parts_found', created_at: '2026-09-30T13:00:00Z', changed_by: 'admin-id' }],
      error: null,
    })
    from.mockImplementation((table: string) => ({ parts_requests: request, request_status_history: history })[table])

    const result = await getTrackingInfo(token)

    expect(result).toMatchObject({
      requestNumber: 'DA-2026-000123',
      customerName: 'Awa Ndiaye',
      status: 'parts_found',
      vehicle: { year: 2021, make: 'Toyota', model: 'RAV4' },
      items: [{ partName: 'Alternator' }],
      statusHistory: [{ oldStatus: 'on_treatment', newStatus: 'parts_found', createdAt: '2026-09-30T13:00:00Z' }],
    })
    const serialized = JSON.stringify(result)
    for (const secret of ['internal-request-id', 'awa@example.test', '+221770000000', 'internal only', 'admin-id']) {
      expect(serialized).not.toContain(secret)
    }

    const selected = request.select.mock.calls[0][0] as string
    expect(selected).toContain('customer_name')
    for (const privateColumn of ['customer_email', 'customer_phone', 'whatsapp_phone', 'admin_notes']) {
      expect(selected).not.toContain(privateColumn)
    }
    expect(history.select).toHaveBeenCalledWith('old_status, new_status, created_at')
  })

  it('rejects malformed tracking tokens before querying', async () => {
    await expect(getTrackingInfo('not-a-token')).resolves.toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('returns null for a well-formed token that is not found', async () => {
    const request = query({ data: null, error: null })
    from.mockReturnValue(request)

    await expect(getTrackingInfo(token)).resolves.toBeNull()
    expect(from).toHaveBeenCalledTimes(1)
  })
})
