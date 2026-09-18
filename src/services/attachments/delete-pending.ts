'use server'

import { supabaseAdmin } from '@/src/lib/supabase/server'
import { ATTACHMENTS_BUCKET } from './bucket'
import { verifyToken } from './upload-token'
import type { FileTokenPayload } from './request-upload-url'

// The one narrowly-scoped client-callable action for cleaning up a pending
// upload before submit (user removed the photo, or is retrying it). Safe to
// expose directly: a fileToken only ever grants deleting the exact single
// object it was signed for (verified here, never trusted from a raw path),
// and it carries no association to any parts_requests row, so this can
// never be used to touch another request's attachments. Always best-effort
// — an object this fails to remove is still swept by the 24h pending-upload
// cleanup (see cleanup.ts), so callers don't need to handle failure.
export async function deletePendingUpload(fileToken: string): Promise<void> {
  const payload = verifyToken<FileTokenPayload>(fileToken, 'pending_attachment')
  if (!payload) return
  await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove([payload.path]).catch(() => {})
}
