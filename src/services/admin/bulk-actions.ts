'use server'

import { supabaseAdmin } from '@/src/lib/supabase/server'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { requireAdmin } from './auth'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BULK_IDS = 500

export type BulkDeleteResult = { ok: true; deletedCount: number } | { ok: false; error: string }
export type BulkArchiveResult = { ok: true; count: number } | { ok: false; error: string }

function sanitizeIds(ids: string[]): string[] | null {
  if (ids.length === 0 || ids.length > MAX_BULK_IDS) return null
  const unique = Array.from(new Set(ids))
  return unique.every((id) => UUID_PATTERN.test(id)) ? unique : null
}

// Archive/restore only ever set archived_at — a plain UPDATE, which (unlike
// delete, see bulkDeleteRequestsAction below) the `authenticated` role does
// have a grant for, same as every status update already does. So these go
// through the normal RLS-respecting session client, not supabaseAdmin —
// requireAdmin() is still the real authorization gate, exactly as it is for
// updateRequestStatusAction.
async function setArchivedAt(table: 'parts_requests' | 'vehicle_requests', ids: string[], archivedAt: string | null): Promise<BulkArchiveResult> {
  await requireAdmin()

  const safeIds = sanitizeIds(ids)
  if (!safeIds) return { ok: false, error: 'invalid_ids' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from(table).update({ archived_at: archivedAt }).in('id', safeIds).select('id')
  if (error) return { ok: false, error: 'update_failed' }

  return { ok: true, count: data?.length ?? 0 }
}

export async function bulkArchiveRequestsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setArchivedAt('parts_requests', ids, new Date().toISOString())
}

export async function bulkRestoreRequestsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setArchivedAt('parts_requests', ids, null)
}

export async function bulkArchiveVehicleRequestsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setArchivedAt('vehicle_requests', ids, new Date().toISOString())
}

export async function bulkRestoreVehicleRequestsAction(ids: string[]): Promise<BulkArchiveResult> {
  return setArchivedAt('vehicle_requests', ids, null)
}

// Hard delete, gated by requireAdmin() — same authorization the rest of the
// admin dashboard relies on (a real is_admin() check against the caller's
// own Supabase session, not something client code could fake). The delete
// itself goes through supabaseAdmin (service-role) rather than the
// session's own RLS-respecting client that every other admin mutation in
// this codebase uses (see queries.ts) — verified live that the
// `authenticated` Postgres role has no DELETE grant at all on
// parts_requests/vehicle_requests (`permission denied for table ...`, not
// merely a missing RLS policy), so the RLS-respecting client can never
// perform this operation regardless of who's signed in. requireAdmin()
// above is what keeps this safe: the privileged client only ever runs
// after a real, database-backed admin check has already passed — this is
// never reachable from client code directly.
export async function bulkDeleteRequestsAction(ids: string[]): Promise<BulkDeleteResult> {
  await requireAdmin()

  const safeIds = sanitizeIds(ids)
  if (!safeIds) return { ok: false, error: 'invalid_ids' }

  const { data, error } = await supabaseAdmin.from('parts_requests').delete().in('id', safeIds).select('id')
  if (error) return { ok: false, error: 'delete_failed' }

  return { ok: true, deletedCount: data?.length ?? 0 }
}

// Same shape/reasoning as bulkDeleteRequestsAction above, for vehicle_requests.
export async function bulkDeleteVehicleRequestsAction(ids: string[]): Promise<BulkDeleteResult> {
  await requireAdmin()

  const safeIds = sanitizeIds(ids)
  if (!safeIds) return { ok: false, error: 'invalid_ids' }

  const { data, error } = await supabaseAdmin.from('vehicle_requests').delete().in('id', safeIds).select('id')
  if (error) return { ok: false, error: 'delete_failed' }

  return { ok: true, deletedCount: data?.length ?? 0 }
}
