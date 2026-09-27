import type { ComponentType } from 'react'

// Pure types — shared by the chat widget and the /api/chat endpoint.
export type ChatRole = 'assistant' | 'user'

export const ASSISTANT_INTENTS = [
  'parts_help',
  'vehicle_sourcing',
  'available_vehicles',
  'tracking',
  'lost_request',
  'vin_help',
  'photo_recognition',
  'faq',
  'contact',
  'human_handoff',
  'off_topic',
  'general',
] as const

export type AssistantIntent = (typeof ASSISTANT_INTENTS)[number]

// What a button under an assistant message may do. `link` hrefs are always
// server-validated against src/lib/chat/routes.ts; the other kinds only
// switch the widget to one of its own guided views.
export type AssistantAction = { type: 'link'; href: string } | { type: 'contact' } | { type: 'faq' } | { type: 'start_recovery' }

export type AssistantReply = {
  message: string
  intent: AssistantIntent
  action: AssistantAction | null
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  action?: AssistantAction | null
  // Label for a link button whose target isn't one of the fixed routes
  // (the "Voir ma demande" link after a recovery).
  actionLabel?: string
  // 'recovery' messages belong to the secure lost-request flow: they are
  // shown in the thread but never sent to the AI (see buildAiHistory).
  channel?: 'recovery'
  // A failed assistant turn, rendered with a retry button — never sent.
  failed?: boolean
}

// One entry of the conversation history the client sends to /api/chat.
export type ChatHistoryEntry = { role: ChatRole; content: string }

export type ChatRequestBody = {
  messages: ChatHistoryEntry[]
  locale: string
  pathname: string | null
}

export type ChatErrorCode =
  | 'invalid_request'
  | 'not_configured'
  | 'too_many_requests'
  | 'timeout'
  | 'rate_limited'
  | 'provider_error'
  | 'invalid_result'
  | 'aborted'

export type ChatApiResponse = { ok: true; reply: AssistantReply } | { ok: false; error: ChatErrorCode }

export type QuickActionId = 'find-part' | 'find-vehicle' | 'available-vehicles' | 'track-request' | 'lost-request' | 'faq' | 'contact'

// 'link' actions navigate straight to an existing route; 'faq'/'contact'
// switch the panel to a guided sub-view backed by real data (FAQ items,
// site settings); 'recovery' starts the secure lost-request flow.
export type QuickAction =
  | { id: QuickActionId; label: string; icon: ComponentType<{ className?: string }>; kind: 'link'; href: string }
  | { id: QuickActionId; label: string; icon: ComponentType<{ className?: string }>; kind: 'faq' | 'contact' | 'recovery' }
