import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), createClient: vi.fn(), maybeSingle: vi.fn(), update: vi.fn() }))
vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('../auth', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/src/lib/supabase/auth-server', () => ({ createSupabaseServerClient: mocks.createClient }))
vi.mock('@/src/services/notifications/send-parts-status-notification', () => ({ sendPartsStatusNotification: vi.fn() }))

import { updateRequestStatusAction } from '../actions'

beforeEach(() => {
  mocks.requireAdmin.mockResolvedValue({ id: 'admin-id' })
  mocks.update.mockReset()
  mocks.maybeSingle.mockResolvedValue({
    data: {
      status: 'on_treatment', request_number: 'DA-1', customer_name: 'Awa', customer_email: null,
      whatsapp_phone: '+221771234567', preferred_contact_method: 'whatsapp', locale: 'fr', tracking_token: 'token',
    }, error: null,
  })
  const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.maybeSingle, update: mocks.update }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  mocks.update.mockReturnValue(chain)
  mocks.createClient.mockResolvedValue({ from: vi.fn(() => chain) })
})

describe('updateRequestStatusAction duplicate protection', () => {
  it('rejects the same status before update/history/notification work', async () => {
    await expect(updateRequestStatusAction('00000000-0000-4000-8000-000000000001', 'on_treatment', '')).resolves.toEqual({
      ok: false,
      error: 'no_change',
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
