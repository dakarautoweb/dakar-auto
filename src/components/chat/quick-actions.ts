import { Wrench, Car, LayoutGrid, PackageSearch, HelpCircle, Headset, KeyRound } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { CHAT_ROUTES } from '@/src/lib/chat/routes'
import type { QuickAction } from '@/src/lib/chat/types'

// The guided entry points, routed to this project's real existing
// pages/flows (hrefs from the shared chat route allowlist). Labels come
// from the caller's dictionary so this stays FR/EN-correct without its own
// copy of the strings.
export function buildQuickActions(t: Dictionary['chatWidget']): QuickAction[] {
  return [
    { id: 'find-part', label: t.quickActions.findPart, icon: Wrench, kind: 'link', href: CHAT_ROUTES.vehicleIdentify },
    { id: 'find-vehicle', label: t.quickActions.findVehicle, icon: Car, kind: 'link', href: CHAT_ROUTES.sourceVehicle },
    { id: 'available-vehicles', label: t.quickActions.availableVehicles, icon: LayoutGrid, kind: 'link', href: CHAT_ROUTES.vehicles },
    { id: 'track-request', label: t.quickActions.trackRequest, icon: PackageSearch, kind: 'link', href: CHAT_ROUTES.track },
    { id: 'lost-request', label: t.quickActions.lostRequest, icon: KeyRound, kind: 'recovery' },
    { id: 'faq', label: t.quickActions.faq, icon: HelpCircle, kind: 'faq' },
    { id: 'contact', label: t.quickActions.contact, icon: Headset, kind: 'contact' },
  ]
}
