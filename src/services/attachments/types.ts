// Pure types only — safe to import from both server and client code.

export type AttachmentType = 'part_photo' | 'vin_photo' | 'vehicle_photo' | 'other'

// One finalize outcome per attachment, keyed by the browser's own
// SelectedPhoto.id (`clientId`) so the UI can map a failure back to the
// exact thumbnail it belongs to instead of only knowing an aggregate count.
export type FinalizedAttachmentResult =
  | { clientId: string; ok: true }
  | { clientId: string; ok: false; reason: 'expired' | 'not_found' | 'invalid_type' | 'too_large' | 'server_error' }

// What the browser sends at submit time for each photo it believes it
// uploaded — the fileToken is the only thing the server actually trusts;
// everything else here is display metadata.
export type PendingAttachmentRef = {
  clientId: string
  fileToken: string
  originalFileName: string
  attachmentType: AttachmentType
}

export type RequestUploadUrlInput = {
  // null for the first file of a session; the sessionToken returned by the
  // previous call for every subsequent file.
  sessionToken: string | null
  fileName: string
  declaredMime: string
  declaredSize: number
  attachmentType: AttachmentType
}

export type RequestUploadUrlResult =
  | {
      ok: true
      sessionToken: string
      fileToken: string
      storagePath: string
      signedUrl: string
    }
  | { ok: false; error: 'rate_limited' | 'too_many_files' | 'invalid_type' | 'invalid_size' | 'session_invalid' | 'server_error' }
