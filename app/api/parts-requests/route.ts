import { NextResponse, after } from 'next/server'
import { validateSubmitPartsRequestInput } from '@/src/services/requests/validate'
import { createPartsRequestRecord } from '@/src/services/requests/create-request'
import type { SubmitPartsRequestInput } from '@/src/services/requests/types'
import { uploadPartsRequestAttachments } from '@/src/services/attachments/upload'
import { DEFAULT_ATTACHMENT_TYPE, isAttachmentType, MAX_FILES } from '@/src/services/attachments/constants'
import { sendPartsRequestEmails } from '@/src/services/email'

// Handles parts request submissions that include photos. Requests without
// photos still go through the existing submitPartsRequestAction Server
// Action unchanged — this endpoint exists because uploading up to 5 x 8MB
// files exceeds the default Server Action body size limit.
export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 })
  }

  const payloadRaw = form.get('payload')
  if (typeof payloadRaw !== 'string') {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 })
  }

  let input: SubmitPartsRequestInput
  try {
    input = JSON.parse(payloadRaw)
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 })
  }

  const validationError = validateSubmitPartsRequestInput(input)
  if (validationError) {
    return NextResponse.json({ ok: false, error: 'validation', message: validationError }, { status: 400 })
  }

  const files = form.getAll('photos').filter((value): value is File => value instanceof File)
  const typesRaw = form.getAll('photoTypes').map((value) => String(value))

  if (files.length > MAX_FILES) {
    return NextResponse.json({ ok: false, error: 'too_many_files' }, { status: 400 })
  }

  let created: Awaited<ReturnType<typeof createPartsRequestRecord>>
  try {
    created = await createPartsRequestRecord(input)
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }

  // The request row is already committed at this point — everything below
  // is best-effort and must never turn a saved request into an error
  // response for the user.
  const attachments = await uploadPartsRequestAttachments({
    requestId: created.id,
    itemId: created.itemId,
    files: files.map((file, index) => ({
      file,
      attachmentType: isAttachmentType(typesRaw[index]) ? typesRaw[index] : DEFAULT_ATTACHMENT_TYPE,
    })),
  })

  after(async () => {
    try {
      await sendPartsRequestEmails({
        requestNumber: created.requestNumber,
        locale: input.locale,
        submittedAt: new Date(),
        attachmentCount: attachments.uploaded,
        vehicle: {
          vin: input.vehicle.vin,
          year: input.vehicle.year,
          make: input.vehicle.make,
          model: input.vehicle.model,
        },
        part: {
          categoryKey: input.part.category,
          partName: input.part.partName.trim(),
          side: input.part.side,
          condition: input.part.condition,
          quantity: input.part.quantity,
          description: input.part.description.trim(),
        },
        contact: {
          name: input.contact.name.trim(),
          email: input.contact.email.trim() || null,
          phone: input.contact.phone.trim(),
          whatsappPhone: created.whatsappPhone,
          preferredContact: input.contact.preferredContact,
        },
      })
    } catch (err) {
      console.error('[email] Unexpected error sending parts request emails:', err instanceof Error ? err.message : 'Unknown error')
    }
  })

  return NextResponse.json({
    ok: true,
    requestNumber: created.requestNumber,
    attachments,
  })
}
