import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  sendNotification: vi.fn(),
}))

vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('../auth', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/src/lib/supabase/auth-server', () => ({ createSupabaseServerClient: mocks.createSupabaseServerClient }))
vi.mock('@/src/lib/supabase/server', () => ({
  supabaseAdmin: { storage: { from: vi.fn(() => ({ upload: vi.fn(), remove: vi.fn() })) } },
}))
vi.mock('@/src/services/notifications/send-vehicle-request-status-notification', () => ({
  sendVehicleRequestStatusNotification: mocks.sendNotification,
}))

import { updateVehicleRequestStatusAction } from '../vehicle-request-actions'

const requestId = '00000000-0000-4000-8000-000000000001'

beforeEach(() => {
  mocks.requireAdmin.mockReset().mockResolvedValue({ id: 'admin' })
  mocks.rpc.mockReset()
  mocks.maybeSingle.mockReset().mockResolvedValue({
    data: {
      status: 'on_treatment', request_number: 'VR-1', customer_name: 'Awa', customer_email: 'a@example.test',
      whatsapp_phone: '+221771234567', preferred_contact_method: 'phone', locale: 'fr',
      tracking_token: '00000000-0000-4000-8000-000000000002',
    },
    error: null,
  })
  const chain = { select: vi.fn(), eq: vi.fn(), maybeSingle: mocks.maybeSingle }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  mocks.createSupabaseServerClient.mockResolvedValue({ from: vi.fn(() => chain), rpc: mocks.rpc })
})

describe('updateVehicleRequestStatusAction database guards', () => {
  it('rejects a no-op before invoking the atomic RPC or a notification', async () => {
    await expect(updateVehicleRequestStatusAction(requestId, 'on_treatment')).resolves.toEqual({ ok: false, error: 'no_change' })
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('does not report success when the RPC returns no row (RLS/filtered-style result)', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null })
    await expect(updateVehicleRequestStatusAction(requestId, 'closed')).resolves.toEqual({ ok: false, error: 'update_failed' })
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('does not mark vehicle_found when atomic match creation fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'manual_vehicle_incomplete' } })
    const form = new FormData()
    form.set('source', 'manual')
    form.set('make', 'Toyota')
    form.set('model', 'RAV4')
    form.set('year', '2021')
    form.set('currency', 'CAD')

    await expect(updateVehicleRequestStatusAction(requestId, 'vehicle_found', form)).resolves.toEqual({ ok: false, error: 'update_failed' })
    expect(mocks.sendNotification).not.toHaveBeenCalled()
  })

  it('ignores browser-supplied bucket/path fields and sends only the server upload result to the RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ changed: true, match_id: null }], error: null })
    const form = new FormData()
    form.set('source', 'manual')
    form.set('make', 'Toyota')
    form.set('model', 'RAV4')
    form.set('year', '2021')
    form.set('currency', 'CAD')
    form.set('image_bucket', 'private-customer-documents')
    form.set('image_path', 'someone-else/secret.jpg')

    await expect(updateVehicleRequestStatusAction(requestId, 'vehicle_found', form)).resolves.toEqual({ ok: true })

    const rpcArguments = mocks.rpc.mock.calls[0][1] as Record<string, unknown>
    expect(rpcArguments).not.toHaveProperty('p_manual_image_bucket')
    expect(rpcArguments.p_manual_image_path).toBeNull()
    expect(JSON.stringify(rpcArguments)).not.toContain('private-customer-documents')
    expect(JSON.stringify(rpcArguments)).not.toContain('someone-else/secret.jpg')
  })
})
