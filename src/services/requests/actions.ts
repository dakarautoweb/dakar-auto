'use server'

import { after } from 'next/server'
import { sendPartsRequestEmails } from '@/src/services/email'
import { buildTrackingUrl } from '@/src/lib/contact-info'
import { finalizePartsRequestAttachments } from '@/src/services/attachments/finalize'
import type { PendingAttachmentRef } from '@/src/services/attachments/types'
import { verifyTurnstileToken } from '@/src/services/turnstile/verify'
import { createPartsRequestRecord } from './create-request'
import { validateSubmitPartsRequestInput } from './validate'
import type { SubmitPartsRequestInput, SubmitPartsRequestResult } from './types'

// Single submission path for both photo and no-photo requests. Photos never
// reach this function as bytes — by the time this runs, each one has
// already been uploaded directly from the browser to Storage (see
// src/services/attachments/request-upload-url.ts); `attachments` here is
// only small JSON references (a signed fileToken per photo), which is what
// keeps this a plain Server Action instead of needing the route-handler
// workaround the old multipart flow required for its larger body size.
export async function submitPartsRequestAction(
  input: SubmitPartsRequestInput,
  attachments?: PendingAttachmentRef[],
  turnstileToken?: string
): Promise<SubmitPartsRequestResult> {
  // Anti-spam gate, checked before anything else runs — a client-side
  // "success" callback on the widget proves nothing on its own, so this is
  // the one place that actually decides whether the request is real. Never
  // creates a request, never touches attachments, on any non-ok result.
  const turnstileResult = await verifyTurnstileToken(turnstileToken)
  if (!turnstileResult.ok) {
    return { ok: false, error: 'turnstile', message: turnstileResult.reason }
  }

  const validationError = validateSubmitPartsRequestInput(input)
  if (validationError) {
    return { ok: false, error: 'validation', message: validationError }
  }

  try {
    const created = await createPartsRequestRecord(input)

    // The request row is already committed at this point — everything
    // below is best-effort per attachment and must never turn a saved
    // request into an error response for the user.
    const attachmentResults =
      attachments && attachments.length > 0
        ? await finalizePartsRequestAttachments({ requestId: created.id, itemId: created.itemId, refs: attachments })
        : undefined
    const attachmentCount = attachmentResults?.filter((r) => r.ok).length ?? 0

    // Fire the confirmation/notification emails after the response is sent —
    // the request is already durably saved, so a slow or failed email must
    // never affect what the user sees. sendPartsRequestEmails is best-effort
    // internally and never throws, but it's wrapped here too as a last line
    // of defense against unexpected errors leaking into the response.
    after(async () => {
      try {
        await sendPartsRequestEmails({
          requestNumber: created.requestNumber,
          trackingUrl: buildTrackingUrl(created.trackingToken),
          locale: input.locale,
          submittedAt: new Date(),
          attachmentCount,
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

    return { ok: true, requestNumber: created.requestNumber, trackingToken: created.trackingToken, attachments: attachmentResults }
  } catch {
    return { ok: false, error: 'server_error' }
  }
}
