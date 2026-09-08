import 'server-only'
import { resendClient, EMAIL_FROM } from './config'
import { buildVehicleRequestStatusUpdateEmail, type VehicleRequestStatusUpdateEmailData } from './templates/vehicle-request-status-update'

// Best-effort only: the database status change is already committed before
// this runs, and a failure here must never be treated as the update having
// failed.
export async function sendVehicleRequestStatusUpdateEmail(
  data: VehicleRequestStatusUpdateEmailData,
  customerEmail: string | null
): Promise<void> {
  if (!customerEmail) return

  if (!resendClient) {
    console.error('[email] RESEND_API_KEY is not configured — skipping vehicle request status update email')
    return
  }

  const { subject, html } = buildVehicleRequestStatusUpdateEmail(data)

  try {
    const { error } = await resendClient.emails.send({ from: EMAIL_FROM, to: customerEmail, subject, html })
    if (error) console.error('[email] Vehicle request status update send failed:', error.message)
  } catch (err) {
    console.error('[email] Vehicle request status update send threw:', err instanceof Error ? err.message : 'Unknown error')
  }
}
