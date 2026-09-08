import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { ATTACHMENTS_BUCKET } from '@/src/services/attachments/bucket'

const SIGNED_URL_TTL_SECONDS = 300 // 5 minutes — long enough to view/open a photo, short-lived by design

// Uses the service_role key deliberately, and only for this one operation:
// the attachments bucket is private with no storage RLS policy granting
// admins read access to objects (they were written by service_role during
// the customer's own upload, which owns them). Minting a short-lived signed
// URL requires either object ownership or service_role — there is no
// narrower credential that can do it. This function must only ever be
// called after the caller has already been confirmed to be an active admin
// via requireAdmin(); it performs no authorization check of its own.
export async function createSignedAttachmentUrls(paths: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>()
  if (paths.length === 0) return result

  const { data, error } = await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    console.error('[admin] createSignedAttachmentUrls failed:', error?.message ?? 'unknown error')
    for (const path of paths) result.set(path, null)
    return result
  }

  for (const entry of data) {
    if (entry.path) result.set(entry.path, entry.signedUrl ?? null)
  }
  // Any path the API didn't return (unexpected) resolves to null so the UI
  // can show "photo unavailable" instead of a broken image.
  for (const path of paths) {
    if (!result.has(path)) result.set(path, null)
  }

  return result
}
