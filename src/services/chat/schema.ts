import 'server-only'
import { ASSISTANT_INTENTS } from '@/src/lib/chat/types'

export const ASSISTANT_REPLY_SCHEMA_NAME = 'dakar_auto_assistant_reply'

export const ACTION_TYPES = ['none', 'link', 'contact', 'faq', 'start_recovery'] as const

// Strict Structured Outputs: every property required, nullable via a type
// union. The server still re-validates everything (validate-reply.ts).
export const ASSISTANT_REPLY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'intent', 'action'],
  properties: {
    message: { type: 'string', description: 'The reply shown to the customer. Plain text, concise.' },
    intent: { type: 'string', enum: [...ASSISTANT_INTENTS] },
    action: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'href'],
      properties: {
        type: { type: 'string', enum: [...ACTION_TYPES] },
        href: { type: ['string', 'null'], description: 'Only for type "link": an allowed internal path.' },
      },
    },
  },
} as const
