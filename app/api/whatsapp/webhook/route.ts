const DELIVERY_STATUSES = new Set(['sent', 'delivered', 'read', 'failed'])
const MAX_FIELD_LENGTH = 500

type JsonRecord = Record<string, unknown>

type DeliveryErrorLog = {
  code?: number | string
  title?: string
  message?: string
  details?: string
}

type DeliveryStatusLog = {
  message_id: string
  status: string
  recipient_id: string
  timestamp: string
  errors?: DeliveryErrorLog[]
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown, maxLength = MAX_FIELD_LENGTH): string | null {
  if (typeof value !== 'string') return null
  return value.slice(0, maxLength)
}

function safeCode(value: unknown): number | string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return safeString(value, 64) ?? undefined
}

function readFailedErrors(value: JsonRecord): DeliveryErrorLog[] {
  if (!Array.isArray(value.errors)) return []

  return value.errors.flatMap((candidate) => {
    if (!isRecord(candidate)) return []

    const errorData = isRecord(candidate.error_data) ? candidate.error_data : null
    const error: DeliveryErrorLog = {
      code: safeCode(candidate.code),
      title: safeString(candidate.title) ?? undefined,
      message: safeString(candidate.message) ?? undefined,
      details: errorData ? (safeString(errorData.details) ?? undefined) : undefined,
    }

    return Object.values(error).some((field) => field !== undefined) ? [error] : []
  })
}

function readDeliveryStatus(value: unknown): DeliveryStatusLog | null {
  if (!isRecord(value)) return null

  const messageId = safeString(value.id, 256)
  const status = safeString(value.status, 32)
  const recipientId = safeString(value.recipient_id, 64)
  const timestamp =
    typeof value.timestamp === 'number' && Number.isFinite(value.timestamp)
      ? String(value.timestamp)
      : safeString(value.timestamp, 32)

  if (!messageId || !status || !DELIVERY_STATUSES.has(status) || !recipientId || !timestamp) return null

  const errors = status === 'failed' ? readFailedErrors(value) : []
  return {
    message_id: messageId,
    status,
    recipient_id: recipientId,
    timestamp,
    ...(errors.length > 0 ? { errors } : {}),
  }
}

function logDeliveryStatuses(payload: unknown): void {
  if (!isRecord(payload) || !Array.isArray(payload.entry)) return

  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue

    for (const change of entry.changes) {
      if (!isRecord(change) || !isRecord(change.value) || !Array.isArray(change.value.statuses)) continue

      for (const candidate of change.value.statuses) {
        const status = readDeliveryStatus(candidate)
        if (status) console.info('[whatsapp-webhook] delivery status', status)
      }
    }
  }
}

export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
  const mode = params.get('hub.mode')
  const suppliedToken = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (expectedToken && mode === 'subscribe' && suppliedToken === expectedToken && challenge !== null) {
    return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: Request): Promise<Response> {
  try {
    logDeliveryStatuses(await request.json())
  } catch {
    // Acknowledge malformed/unexpected events without logging their body or
    // making Meta retry a diagnostic-only endpoint.
  }

  return new Response('EVENT_RECEIVED', { status: 200 })
}
