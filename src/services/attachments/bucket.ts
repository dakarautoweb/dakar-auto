import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './constants'

export const ATTACHMENTS_BUCKET = 'parts-request-attachments'

let bucketEnsured = false

// Idempotent, lazy bucket provisioning: creates the private attachments
// bucket the first time it's needed and remembers that for the life of
// this server instance. The bucket is never made public — every read or
// write goes through server code using the service role key, never the
// browser directly.
export async function ensurePartsRequestAttachmentsBucket(): Promise<void> {
  if (bucketEnsured) return

  const { data: existing } = await supabaseAdmin.storage.getBucket(ATTACHMENTS_BUCKET)
  if (existing) {
    bucketEnsured = true
    return
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE_BYTES,
    allowedMimeTypes: [...ALLOWED_MIME_TYPES],
  })

  // Ignore "already exists" races (e.g. concurrent cold starts creating it
  // at the same time) — anything else should fail loudly rather than let
  // the first upload silently target a bucket that was never created.
  if (createError && !/already exists/i.test(createError.message)) {
    throw createError
  }

  bucketEnsured = true
}
