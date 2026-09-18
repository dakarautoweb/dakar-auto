import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { ATTACHMENTS_BUCKET } from './bucket'

// Orphan cleanup for the `pending/` prefix: a signed upload URL that's
// never finalized (user abandoned the wizard, closed the tab, or the
// fileToken simply expired before submit) leaves a real object in Storage
// that nothing will ever reference — this sweeps anything older than the
// cutoff. No cron is wired up yet (see app/api/admin/cleanup-pending-uploads
// for the documented, admin-gated manual trigger); this function is the
// prepared "cleanup architecture" a real cron can call later.
export async function cleanupExpiredPendingUploads(olderThanHours = 24): Promise<{ scanned: number; removed: number }> {
  const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000

  const { data: sessionFolders, error: listError } = await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).list('pending', { limit: 1000 })
  if (listError || !sessionFolders) {
    console.error('[attachments] cleanup: failed to list pending/ prefix:', listError?.message)
    return { scanned: 0, removed: 0 }
  }

  let scanned = 0
  let removed = 0

  for (const folder of sessionFolders) {
    if (!folder.name) continue

    const { data: files, error: filesError } = await supabaseAdmin.storage
      .from(ATTACHMENTS_BUCKET)
      .list(`pending/${folder.name}`, { limit: 1000 })
    if (filesError || !files) continue

    scanned += files.length

    const stalePaths = files
      .filter((file) => file.created_at && new Date(file.created_at).getTime() < cutoff)
      .map((file) => `pending/${folder.name}/${file.name}`)

    if (stalePaths.length === 0) continue

    const { error: removeError } = await supabaseAdmin.storage.from(ATTACHMENTS_BUCKET).remove(stalePaths)
    if (!removeError) removed += stalePaths.length
  }

  return { scanned, removed }
}
