'use server'

import { after } from 'next/server'
import { sendVehicleRequestNotifications } from '@/src/services/notifications/send-vehicle-request-notifications'
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

    // Fire the admin notification and the customer confirmation (on the
    // customer's chosen channel only — WhatsApp, email, or none for phone)
    // after the response is sent. The request is already durably saved, so
    // a slow or failed delivery must never affect what the user sees.
    // sendVehicleRequestNotifications is best-effort internally and never
    // throws, but it's wrapped here too as a last line of defense.
    after(async () => {
      try {
        await sendVehicleRequestNotifications({
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
          '[notifications] Unexpected error sending vehicle request notifications:',
          err instanceof Error ? err.message : 'Unknown error'
        )
      }
    })

    return { ok: true, requestNumber: created.requestNumber, trackingToken: created.trackingToken }
  } catch {
    return { ok: false, error: 'server_error' }
  }
}
