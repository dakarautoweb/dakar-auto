// Pure — shared by the chat widget (client) and the assistant (server).
//
// The ONLY internal pages the chat may link to. Quick actions, assistant
// action buttons and the assistant's knowledge of "where things are" all
// read from here, so a route is added or renamed in one place. Anything the
// model returns that is not on this list (external URLs, query strings,
// unknown paths) is dropped server-side — see resolveActionHref().
export const CHAT_ROUTES = {
  home: '/',
  parts: '/parts',
  vehicleIdentify: '/vehicle/identify',
  sourceVehicle: '/source-a-vehicle',
  vehicles: '/vehicles',
  track: '/track',
  faq: '/faq',
  about: '/about',
} as const

export type ChatRouteId = keyof typeof CHAT_ROUTES
export type ChatRouteHref = (typeof CHAT_ROUTES)[ChatRouteId]

const STATIC_HREFS = new Set<string>(Object.values(CHAT_ROUTES))

// Every public page the customer can be on when opening the widget. Dynamic
// segments are collapsed to their template: /track/<token> carries the
// customer's secret tracking token and /vehicles/<id> an internal id, so
// neither raw value ever leaves the browser-side pathname.
const PAGE_TEMPLATES = [...STATIC_HREFS, '/privacy', '/terms'] as const
const DYNAMIC_PAGES: { pattern: RegExp; template: string }[] = [
  { pattern: /^\/track\/[^/]+$/, template: '/track/[token]' },
  { pattern: /^\/vehicles\/[^/]+$/, template: '/vehicles/[id]' },
]

const MAX_PATHNAME_LENGTH = 200

// Accepts what usePathname() returns and reduces it to a known page
// template, or null. Query strings and fragments are stripped first (they
// can carry a VIN — /vehicle/identify?vin=… — or other customer input).
export function sanitizePathname(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > MAX_PATHNAME_LENGTH) return null
  const path = raw.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/'
  if (!path.startsWith('/') || path.startsWith('//')) return null
  if ((PAGE_TEMPLATES as readonly string[]).includes(path)) return path
  return DYNAMIC_PAGES.find(({ pattern }) => pattern.test(path))?.template ?? null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function vehicleDetailHref(id: string): string {
  return `/vehicles/${id}`
}

// Validates an href proposed by the model. Accepted: one of CHAT_ROUTES
// exactly, or /vehicles/<id> for a vehicle id returned by the inventory
// search in the same turn (so the model can't point at a made-up listing).
export function resolveActionHref(href: unknown, allowedVehicleIds: ReadonlySet<string> = new Set()): string | null {
  if (typeof href !== 'string') return null
  const value = href.trim()
  if (STATIC_HREFS.has(value)) return value
  const match = /^\/vehicles\/([^/?#]+)$/.exec(value)
  if (match && UUID_PATTERN.test(match[1]) && allowedVehicleIds.has(match[1])) return value
  return null
}
