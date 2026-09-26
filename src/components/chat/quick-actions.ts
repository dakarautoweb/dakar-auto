import { Wrench, Car, LayoutGrid, PackageSearch, HelpCircle, Headset } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { QuickAction } from '@/src/lib/chat/types'

// The six guided entry points from the spec, routed to this project's real
// existing pages/flows — never a placeholder route. Labels come from the
// caller's dictionary so this stays FR/EN-correct without its own copy of
// the strings.
export function buildQuickActions(t: Dictionary['chatWidget']): QuickAction[] {
  return [
    { id: 'find-part', label: t.quickActions.findPart, icon: Wrench, kind: 'link', href: '/vehicle/identify' },
    { id: 'find-vehicle', label: t.quickActions.findVehicle, icon: Car, kind: 'link', href: '/source-a-vehicle' },
    { id: 'available-vehicles', label: t.quickActions.availableVehicles, icon: LayoutGrid, kind: 'link', href: '/vehicles' },
    { id: 'track-request', label: t.quickActions.trackRequest, icon: PackageSearch, kind: 'link', href: '/track' },
    { id: 'faq', label: t.quickActions.faq, icon: HelpCircle, kind: 'faq' },
    { id: 'contact', label: t.quickActions.contact, icon: Headset, kind: 'contact' },
  ]
}
