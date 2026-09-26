import type { ComponentType } from 'react'

// Deliberately minimal: a real message-input flow can add a 'system' role
// and richer content later without reshaping this. Keeping it this small
// now is what item 9 of the spec means by "don't overengineer" — there's
// no unused AI framework here, just the shape a future responder needs.
export type ChatRole = 'assistant' | 'user'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

export type QuickActionId = 'find-part' | 'find-vehicle' | 'available-vehicles' | 'track-request' | 'faq' | 'contact'

// 'link' actions navigate straight to an existing route; 'faq'/'contact'
// instead switch the panel to a guided sub-view backed by real data (FAQ
// items, site settings) — see chat-widget.tsx. This split is the "clean
// separation between UI and response logic" item 9 asks for: swapping the
// guided FAQ/contact views for an AI-driven response later only touches
// chat-widget.tsx, never this action list.
export type QuickAction =
  | { id: QuickActionId; label: string; icon: ComponentType<{ className?: string }>; kind: 'link'; href: string }
  | { id: QuickActionId; label: string; icon: ComponentType<{ className?: string }>; kind: 'faq' | 'contact' }
