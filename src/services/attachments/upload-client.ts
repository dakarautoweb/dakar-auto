// Browser-only — no 'server-only' import. Performs the actual byte PUT
// directly to Supabase Storage using the signed URL minted by
// requestUploadUrl(); this is the step that used to be a multipart POST to
// our own /api/parts-requests route.
//
// Uses XMLHttpRequest instead of fetch specifically for `xhr.upload.onprogress`
// — fetch has no broadly-supported portable upload-progress API, and the
// spec calls for real per-file progress, not an indeterminate spinner. The
// request body/headers here deliberately replicate what the installed
// @supabase/supabase-js@2.116.0's own storage-js `uploadToSignedUrl()` sends
// (read from node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts
// while building this): a multipart FormData with a `cacheControl` field and
// the file under the empty-string field name, PUT to the signed URL (the
// upload token is already embedded in its query string — nothing else is
// needed, and per that same source no storage RLS policy is required for
// this request to succeed). This is a deliberate coupling to that
// dependency's current wire format in exchange for real progress events; if
// a future @supabase/storage-js upgrade ever changes it, fall back to
// calling `supabase.storage.from(bucket).uploadToSignedUrl()` from the
// official SDK instead (loses progress, gains version-proofing).
export function uploadPhotoDirect(
  file: File,
  signedUrl: string,
  onProgress: (percent: number) => void
): Promise<{ ok: true } | { ok: false }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve({ ok: true })
      } else {
        resolve({ ok: false })
      }
    }
    xhr.onerror = () => resolve({ ok: false })
    xhr.onabort = () => resolve({ ok: false })

    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file)
    xhr.send(body)
  })
}
