import 'server-only'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { CHAT_ROUTES } from '@/src/lib/chat/routes'
import { PART_CATEGORY_KEYS, PART_SUBCATEGORY_KEYS } from '@/src/lib/parts-catalog'
import { REQUEST_STATUSES } from '@/src/services/admin/statuses'
import { VEHICLE_REQUEST_STATUSES } from '@/src/services/admin/vehicle-request-statuses'
import type { PublicFaqItem } from '@/src/services/faq/types'
import type { PublicSiteSettings } from '@/src/services/site-settings/types'

// Dakar Auto's public knowledge, assembled from the application's own
// sources of truth rather than a hand-written description of the site:
// routes (lib/chat/routes.ts), request statuses (admin/statuses.ts,
// admin/vehicle-request-statuses.ts), the parts catalog (lib/parts-catalog.ts
// + the dictionary's category titles), the published FAQ and which public
// contact channels are configured. Wording comes from the same localized
// dictionary the pages render, so the assistant describes the site the way
// the customer sees it.
//
// Public data only. Nothing customer- or request-specific is ever in here.

export type KnowledgeSources = {
  dict: Dictionary
  faqItems: PublicFaqItem[]
  settings: PublicSiteSettings
}

const MAX_FAQ_ITEMS = 30
const MAX_FAQ_ANSWER_CHARS = 500

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

export function describeRoutes(dict: Dictionary): string {
  const photo = dict.wizard.parts.identifyPhoto
  const steps = Object.values(dict.wizard.steps).join(' → ')
  const lines: [string, string][] = [
    [CHAT_ROUTES.home, `${dict.header.nav.home}. ${dict.meta.description}`],
    [
      CHAT_ROUTES.vehicleIdentify,
      `Start a PARTS request (no account needed). Steps: ${steps}. Vehicle step: "${dict.wizard.vin.description}" or "${dict.wizard.vin.manualCta}" (make/model/year). ` +
        `Part step: choose the category and subcategory; a customer who does not know the part's name can press "${photo.cta}" (${photo.hint}) — the photo is analysed there, never in this chat.`,
    ],
    [CHAT_ROUTES.parts, `${dict.header.nav.parts}: browse the parts catalog by category. ${dict.partsPage.description}`],
    [CHAT_ROUTES.sourceVehicle, `Vehicle SOURCING request (${dict.sourceVehiclePage.title}): ${dict.sourceVehiclePage.description} ${dict.sourceVehicle.description}`],
    [CHAT_ROUTES.vehicles, `${dict.vehiclesPage.title}: ${dict.vehiclesPage.description}`],
    [CHAT_ROUTES.track, `${dict.tracking.lookup.title}: ${dict.tracking.lookup.subtitle} ${dict.tracking.lookup.helpText}`],
    [CHAT_ROUTES.faq, `${dict.faqPage.title}: ${dict.faqPage.description}`],
    [CHAT_ROUTES.about, `${dict.header.nav.about}.`],
  ]
  return lines.map(([href, text]) => `- ${href} — ${text}`).join('\n')
}

export function describeRequestTypes(dict: Dictionary): string {
  const parts = REQUEST_STATUSES.map((s) => dict.admin.statuses[s]).join(', ')
  const vehicle = VEHICLE_REQUEST_STATUSES.map((s) => dict.admin.vehicleStatuses[s]).join(', ')
  return [
    `- Parts request: request number starting with "DA-", made at ${CHAT_ROUTES.vehicleIdentify}. Statuses: ${parts}.`,
    `- Vehicle sourcing request: request number starting with "VR-", made at ${CHAT_ROUTES.sourceVehicle}. Statuses: ${vehicle}.`,
    `- Example request numbers: ${dict.tracking.lookup.requestNumberPlaceholder}. The number and a tracking link are in the confirmation the customer received.`,
    `- Tracking at ${CHAT_ROUTES.track} needs the request number AND the email or phone used for the request.`,
  ].join('\n')
}

export function describePartsCatalog(dict: Dictionary): string {
  return PART_CATEGORY_KEYS.map((key) => {
    const item = dict.categories.items.find((c) => c.key === key)
    if (!item) return null
    const subTitles = PART_SUBCATEGORY_KEYS[key].map((subKey) => item.subcategories.find((s) => s.key === subKey)?.title).filter(Boolean)
    return `- ${item.title}: ${subTitles.join(', ')}`
  })
    .filter(Boolean)
    .join('\n')
}

export function describeFaq(items: PublicFaqItem[]): string {
  if (items.length === 0) return '(no published FAQ entries)'
  return items
    .slice(0, MAX_FAQ_ITEMS)
    .map((item) => `Q: ${clip(item.question, 200)}\nA: ${clip(item.answer, MAX_FAQ_ANSWER_CHARS)}`)
    .join('\n')
}

// Which channels exist — not the numbers/addresses themselves: the widget's
// own contact buttons (action "contact") show those from site settings.
export function describeContact(settings: PublicSiteSettings): string {
  const channels = [settings.whatsapp && 'WhatsApp', settings.phone && 'phone', settings.email && 'email'].filter(Boolean)
  return channels.length > 0
    ? `Available contact channels: ${channels.join(', ')} (offer them with action "contact").`
    : 'No public contact channel is configured right now; suggest the FAQ or submitting a request instead.'
}

const PAGE_CONTEXT: Record<string, string> = {
  '/track/[token]': "the customer's own request tracking page",
  '/vehicles/[id]': 'the detail page of one published vehicle',
  '/privacy': 'the privacy policy',
  '/terms': 'the terms of use',
}

export function describeCurrentPage(pathname: string | null): string {
  if (!pathname) return 'unknown'
  return PAGE_CONTEXT[pathname] ? `${pathname} (${PAGE_CONTEXT[pathname]})` : pathname
}

export function buildKnowledge({ dict, faqItems, settings }: KnowledgeSources): string {
  return [
    '## Public pages (the only links you may use)',
    describeRoutes(dict),
    '',
    '## Request types and statuses',
    describeRequestTypes(dict),
    '',
    '## Parts catalog (category: subcategories)',
    describePartsCatalog(dict),
    '',
    '## FAQ (published)',
    describeFaq(faqItems),
    '',
    '## Contact',
    describeContact(settings),
  ].join('\n')
}
