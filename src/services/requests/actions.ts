'use server'

import { after } from 'next/server'
import { sendPartsRequestEmails } from '@/src/services/email'
import { createPartsRequestRecord } from './create-request'
import { validateSubmitPartsRequestInput } from './validate'
import type { SubmitPartsRequestInput, SubmitPartsRequestResult } from './types'

export async function submitPartsRequestAction(
  input: SubmitPartsRequestInput
): Promise<SubmitPartsRequestResult> {
  const validationError = validateSubmitPartsRequestInput(input)
  if (validationError) {
    return { ok: false, error: 'validation', message: validationError }
  }

  try {
    const created = await createPartsRequestRecord(input)

    // Fire the confirmation/notification emails after the response is sent —
    // the request is already durably saved, so a slow or failed email must
    // never affect what the user sees. sendPartsRequestEmails is best-effort
    // internally and never throws, but it's wrapped here too as a last line
    // of defense against unexpected errors leaking into the response.
    after(async () => {
      try {
        await sendPartsRequestEmails({
          requestNumber: created.requestNumber,
          locale: input.locale,
          submittedAt: new Date(),
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

    return { ok: true, requestNumber: created.requestNumber }
  } catch {
    return { ok: false, error: 'server_error' }
  }
}
