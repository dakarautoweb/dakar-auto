'use server'

import { after } from 'next/server'
import { sendVehicleRequestEmails } from '@/src/services/email'
import { buildTrackingUrl } from '@/src/lib/contact-info'
import { verifyTurnstileToken } from '@/src/services/turnstile/verify'
import { createVehicleRequestRecord } from './create-request'
import { validateSubmitVehicleRequestInput } from './validate'
import type { SubmitVehicleRequestInput, SubmitVehicleRequestResult } from './types'

export async function submitVehicleRequestAction(
  input: SubmitVehicleRequestInput,
  turnstileToken?: string
): Promise<SubmitVehicleRequestResult> {
  const turnstileResult = await verifyTurnstileToken(turnstileToken)
  if (!turnstileResult.ok) {
    return { ok: false, error: 'turnstile', message: turnstileResult.reason }
  }

  const validationError = validateSubmitVehicleRequestInput(input)
  if (validationError) {
    return { ok: false, error: 'validation', message: validationError }
  }

  try {
    const created = await createVehicleRequestRecord(input)

    // Fire the confirmation/notification emails after the response is sent
    // — the request is already durably saved, so a slow or failed email
    // must never affect what the user sees.
    after(async () => {
      try {
        await sendVehicleRequestEmails({
          requestNumber: created.requestNumber,
          trackingUrl: buildTrackingUrl(created.trackingToken),
          locale: input.locale,
          submittedAt: new Date(),
          vehicle: { ...input.vehicle },
          contact: {
            name: input.contact.name.trim(),
            email: input.contact.email.trim() || null,
            phone: input.contact.phone.trim(),
            whatsappPhone: created.whatsappPhone,
            preferredContact: input.contact.preferredContact,
          },
        })
      } catch (err) {
        console.error(
          '[email] Unexpected error sending vehicle request emails:',
          err instanceof Error ? err.message : 'Unknown error'
        )
      }
    })

    return { ok: true, requestNumber: created.requestNumber, trackingToken: created.trackingToken }
  } catch {
    return { ok: false, error: 'server_error' }
  }
}
