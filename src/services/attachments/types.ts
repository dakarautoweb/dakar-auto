// Pure types only — safe to import from both server and client code.

export type AttachmentType = 'part_photo' | 'vin_photo' | 'vehicle_photo' | 'other'

export type UploadAttachmentsResult = {
  uploaded: number
  failed: number
}
