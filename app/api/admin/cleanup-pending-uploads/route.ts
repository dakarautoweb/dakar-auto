import { NextResponse } from 'next/server'
import { requireAdmin } from '@/src/services/admin/auth'
import { cleanupExpiredPendingUploads } from '@/src/services/attachments/cleanup'

// Manual trigger for sweeping abandoned pending-upload objects (see
// src/services/attachments/cleanup.ts) — no cron is wired up yet, this is
// the "documented cleanup path" until one is needed. requireAdmin() redirects
// unauthenticated/non-admin callers rather than returning a JSON error, same
// as every other admin-gated Server Action/route in this codebase.
//
// To wire this to a real Vercel Cron later: add a `crons` entry to
// vercel.json pointing at a sibling route protected by a bearer-token check
// against a new CRON_SECRET env var instead of requireAdmin() (cron
// invocations have no admin browser session to check).
export async function POST() {
  await requireAdmin()
  const result = await cleanupExpiredPendingUploads()
  return NextResponse.json(result)
}
