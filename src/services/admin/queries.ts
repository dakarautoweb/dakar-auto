import 'server-only'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { REQUEST_STATUSES, type RequestStatus } from './statuses'
import { VEHICLE_REQUEST_STATUSES, type VehicleRequestStatus } from './vehicle-request-statuses'

// All reads here go through the authenticated, RLS-respecting client — the
// admin's own session decides what's visible, gated by the database's
// is_admin()-backed policies. No service_role key involved.

export type PartsRequestRow = {
  id: string
  request_number: string
  created_at: string
  status: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  preferred_contact_method: string
  locale: string
  archived_at: string | null
  vehicles: {
    id: string
    vin: string | null
    year: number | null
    make: string
    model: string
  } | null
  parts_request_items: { category: string; part_name: string }[]
}

// 'active' (default) — archived_at IS NULL, the normal working list and
// everything that feeds dashboard KPIs / sidebar badges. 'archived' —
// archived_at IS NOT NULL, the Archived view. 'all' — no filter at all
// (used by the Archived/All picker itself, and safe for Statistics/Reports
// if that ever wants an unfiltered count).
export type ArchivedView = 'active' | 'archived' | 'all'

export type PartsRequestFilters = {
  search?: string
  status?: RequestStatus | 'all'
  sort?: 'newest' | 'oldest'
  // Inclusive ISO bounds on created_at — used by the "Aujourd'hui / 7 jours /
  // 30 jours / personnalisé" date filter above the admin table. Both optional
  // and independent so "from" alone (open-ended range) works too.
  dateFrom?: string
  dateTo?: string
  archived?: ArchivedView
}

// PostgREST's .or() takes a raw filter expression — strip characters that
// have syntactic meaning in it so a search string can't inject extra
// conditions.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()]/g, ' ').trim().slice(0, 100)
}

export async function listPartsRequests(filters: PartsRequestFilters): Promise<PartsRequestRow[]> {
  const supabase = await createSupabaseServerClient()
  const search = filters.search ? sanitizeSearchTerm(filters.search) : ''

  let vehicleIds: string[] = []
  if (search) {
    const { data: matchedVehicles } = await supabase.from('vehicles').select('id').ilike('vin', `%${search}%`).limit(50)
    vehicleIds = (matchedVehicles ?? []).map((v) => v.id as string)
  }

  let query = supabase
    .from('parts_requests')
    .select(
      'id, request_number, created_at, status, customer_name, customer_phone, customer_email, preferred_contact_method, locale, archived_at, vehicle_id, vehicles(id, vin, year, make, model), parts_request_items(category, part_name)'
    )
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .limit(200)

  const archivedView = filters.archived ?? 'active'
  if (archivedView === 'active') query = query.is('archived_at', null)
  else if (archivedView === 'archived') query = query.not('archived_at', 'is', null)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo)

  if (search) {
    const orParts = [
      `request_number.ilike.%${search}%`,
      `customer_name.ilike.%${search}%`,
      `customer_phone.ilike.%${search}%`,
      `customer_email.ilike.%${search}%`,
    ]
    if (vehicleIds.length > 0) {
      orParts.push(`vehicle_id.in.(${vehicleIds.join(',')})`)
    }
    query = query.or(orParts.join(','))
  }

  const { data, error } = await query
  if (error) {
    console.error('[admin] listPartsRequests failed:', error.message)
    return []
  }

  return (data ?? []) as unknown as PartsRequestRow[]
}

export type DashboardStats = {
  total: number
  requestReceived: number
  onTreatment: number
  partsFound: number
  today: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // .is('archived_at', null) on every branch: dashboard KPIs count active
  // requests only — an archived request must not keep inflating these
  // numbers just because it once existed.
  const base = () => supabase.from('parts_requests').select('id', { count: 'exact', head: true }).is('archived_at', null)

  const [total, requestReceived, onTreatment, partsFound, today] = await Promise.all([
    base(),
    base().eq('status', 'request_received'),
    base().eq('status', 'on_treatment'),
    base().eq('status', 'parts_found'),
    base().gte('created_at', startOfToday.toISOString()),
  ])

  return {
    total: total.count ?? 0,
    requestReceived: requestReceived.count ?? 0,
    onTreatment: onTreatment.count ?? 0,
    partsFound: partsFound.count ?? 0,
    today: today.count ?? 0,
  }
}

export type PartsRequestDetail = {
  id: string
  request_number: string
  created_at: string
  status: string
  locale: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  whatsapp_phone: string | null
  whatsapp_same_as_phone: boolean
  preferred_contact_method: string
  admin_notes: string | null
  archived_at: string | null
  vehicle: {
    id: string
    vin: string | null
    year: number | null
    make: string
    model: string
    trim: string | null
    engine: string | null
    transmission: string | null
    body_style: string | null
    fuel_type: string | null
    drivetrain: string | null
    image_url: string | null
    identification_method: string
  } | null
  items: {
    id: string
    category: string
    subcategory: string | null
    part_name: string
    description: string | null
    quantity: number
    condition_preference: string
  }[]
  attachments: {
    id: string
    item_id: string | null
    file_url: string
    file_type: string | null
    file_name: string | null
    attachment_type: string
    created_at: string
  }[]
}

export async function getPartsRequestDetail(id: string): Promise<PartsRequestDetail | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('parts_requests')
    .select(
      `id, request_number, created_at, status, locale, customer_name, customer_phone, customer_email,
       whatsapp_phone, whatsapp_same_as_phone, preferred_contact_method, admin_notes, archived_at,
       vehicles(id, vin, year, make, model, trim, engine, transmission, body_style, fuel_type, drivetrain, image_url, identification_method),
       parts_request_items(id, category, subcategory, part_name, description, quantity, condition_preference),
       request_attachments(id, item_id, file_url, file_type, file_name, attachment_type, created_at)`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin] getPartsRequestDetail failed:', error.message)
    return null
  }
  if (!data) return null

  const row = data as unknown as Record<string, unknown>

  return {
    id: row.id as string,
    request_number: row.request_number as string,
    created_at: row.created_at as string,
    status: row.status as string,
    locale: row.locale as string,
    customer_name: row.customer_name as string,
    customer_phone: row.customer_phone as string,
    customer_email: row.customer_email as string | null,
    whatsapp_phone: row.whatsapp_phone as string | null,
    whatsapp_same_as_phone: row.whatsapp_same_as_phone as boolean,
    preferred_contact_method: row.preferred_contact_method as string,
    admin_notes: row.admin_notes as string | null,
    archived_at: row.archived_at as string | null,
    vehicle: (row.vehicles as PartsRequestDetail['vehicle']) ?? null,
    items: (row.parts_request_items as PartsRequestDetail['items']) ?? [],
    attachments: (row.request_attachments as PartsRequestDetail['attachments']) ?? [],
  }
}

export type StatusHistoryEntry = {
  id: string
  old_status: string | null
  new_status: string
  note: string | null
  created_at: string
  changedByLabel: string | null
}

export async function getStatusHistory(requestId: string): Promise<StatusHistoryEntry[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('request_status_history')
    .select('id, old_status, new_status, note, created_at, changed_by')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin] getStatusHistory failed:', error.message)
    return []
  }

  const rows = data ?? []
  const adminIds = [...new Set(rows.map((r) => r.changed_by).filter((v): v is string => Boolean(v)))]

  const adminLabels = new Map<string, string>()
  if (adminIds.length > 0) {
    const { data: admins } = await supabase.from('admins').select('id, full_name, email').in('id', adminIds)
    for (const a of admins ?? []) {
      adminLabels.set(a.id as string, (a.full_name as string | null) || (a.email as string))
    }
  }

  return rows.map((r) => ({
    id: r.id as string,
    old_status: r.old_status as string | null,
    new_status: r.new_status as string,
    note: r.note as string | null,
    created_at: r.created_at as string,
    changedByLabel: r.changed_by ? (adminLabels.get(r.changed_by as string) ?? null) : null,
  }))
}

export type VehicleRequestRow = {
  id: string
  request_number: string
  created_at: string
  status: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  whatsapp_phone: string | null
  preferred_contact_method: string
  make: string | null
  model: string | null
  year_from: number | null
  year_to: number | null
  archived_at: string | null
}

export type VehicleRequestFilters = {
  search?: string
  status?: VehicleRequestStatus | 'all'
  sort?: 'newest' | 'oldest'
  dateFrom?: string
  dateTo?: string
  archived?: ArchivedView
}

export async function listVehicleRequests(filters: VehicleRequestFilters = {}): Promise<VehicleRequestRow[]> {
  const supabase = await createSupabaseServerClient()
  const search = filters.search ? sanitizeSearchTerm(filters.search) : ''

  let query = supabase
    .from('vehicle_requests')
    .select(
      'id, request_number, created_at, status, customer_name, customer_phone, customer_email, whatsapp_phone, preferred_contact_method, make, model, year_from, year_to, archived_at'
    )
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .limit(200)

  const archivedView = filters.archived ?? 'active'
  if (archivedView === 'active') query = query.is('archived_at', null)
  else if (archivedView === 'archived') query = query.not('archived_at', 'is', null)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo)

  if (search) {
    query = query.or(
      [
        `request_number.ilike.%${search}%`,
        `customer_name.ilike.%${search}%`,
        `customer_phone.ilike.%${search}%`,
        `customer_email.ilike.%${search}%`,
        `make.ilike.%${search}%`,
        `model.ilike.%${search}%`,
      ].join(',')
    )
  }

  const { data, error } = await query
  if (error) {
    console.error('[admin] listVehicleRequests failed:', error.message)
    return []
  }

  return (data ?? []) as VehicleRequestRow[]
}

export type VehicleRequestDetail = {
  id: string
  request_number: string
  created_at: string
  status: string
  locale: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  whatsapp_phone: string | null
  preferred_contact_method: string
  admin_notes: string | null
  make: string | null
  model: string | null
  year_from: number | null
  year_to: number | null
  color: string | null
  engine: string | null
  transmission: string | null
  mileage_min: number | null
  mileage_max: number | null
  trim_level: string | null
  budget_min: number | null
  budget_max: number | null
  currency: string
  other_preferences: string | null
  archived_at: string | null
}

export async function getVehicleRequestDetail(id: string): Promise<VehicleRequestDetail | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('vehicle_requests')
    .select(
      `id, request_number, created_at, status, locale, customer_name, customer_phone, customer_email,
       whatsapp_phone, preferred_contact_method, admin_notes,
       make, model, year_from, year_to, color, engine, transmission,
       mileage_min, mileage_max, trim_level, budget_min, budget_max, currency, other_preferences, archived_at`
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin] getVehicleRequestDetail failed:', error.message)
    return null
  }

  return (data as VehicleRequestDetail) ?? null
}

export type VehicleRequestsStats = {
  total: number
  today: number
}

export async function getVehicleRequestsStats(): Promise<VehicleRequestsStats> {
  const supabase = await createSupabaseServerClient()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // Same active-only convention as getDashboardStats above.
  const base = () => supabase.from('vehicle_requests').select('id', { count: 'exact', head: true }).is('archived_at', null)

  const [total, today] = await Promise.all([base(), base().gte('created_at', startOfToday.toISOString())])

  return {
    total: total.count ?? 0,
    today: today.count ?? 0,
  }
}

// Sidebar "new requests" badges — just the request_received count for each
// request type, reusing the exact same status the KPI cards and quick
// filters already key off. No websocket/polling: the count is as fresh as
// the current server-rendered page load, same as everything else here.
export type NewRequestsBadgeCounts = {
  parts: number
  vehicles: number
}

export async function getNewRequestsBadgeCounts(): Promise<NewRequestsBadgeCounts> {
  const supabase = await createSupabaseServerClient()

  // .is('archived_at', null): an archived request must not keep pinging the
  // sidebar as "new" just because its status happens to still be
  // request_received.
  const [parts, vehicles] = await Promise.all([
    supabase.from('parts_requests').select('id', { count: 'exact', head: true }).eq('status', 'request_received').is('archived_at', null),
    supabase.from('vehicle_requests').select('id', { count: 'exact', head: true }).eq('status', 'request_received').is('archived_at', null),
  ])

  return {
    parts: parts.count ?? 0,
    vehicles: vehicles.count ?? 0,
  }
}

// --- Clients ------------------------------------------------------------
//
// There is no `customers` table — every request stores its own contact
// snapshot inline (parts_requests / vehicle_requests). This reconstructs a
// client list purely by grouping those existing rows by contact identity
// (phone first, falling back to email), so it only ever reflects requests
// that were actually submitted — never invented data.

export type ClientRow = {
  key: string
  name: string
  email: string | null
  phone: string
  whatsapp: string | null
  requestsCount: number
  lastRequestAt: string
}

type ClientSourceRow = {
  customer_name: string
  customer_phone: string
  customer_email: string | null
  whatsapp_phone: string | null
  created_at: string
}

function normalizeContactKey(row: ClientSourceRow): string {
  const phoneDigits = row.customer_phone.replace(/[^0-9]/g, '')
  if (phoneDigits) return `p:${phoneDigits}`
  if (row.customer_email) return `e:${row.customer_email.trim().toLowerCase()}`
  return `n:${row.customer_name.trim().toLowerCase()}`
}

export async function listClients(): Promise<ClientRow[]> {
  const supabase = await createSupabaseServerClient()

  const [partsRes, vehicleRes] = await Promise.all([
    supabase
      .from('parts_requests')
      .select('customer_name, customer_phone, customer_email, whatsapp_phone, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('vehicle_requests')
      .select('customer_name, customer_phone, customer_email, whatsapp_phone, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const sourceRows = [...((partsRes.data ?? []) as ClientSourceRow[]), ...((vehicleRes.data ?? []) as ClientSourceRow[])]

  const clients = new Map<string, ClientRow>()
  for (const row of sourceRows) {
    const key = normalizeContactKey(row)
    const existing = clients.get(key)
    if (existing) {
      existing.requestsCount += 1
      if (row.created_at > existing.lastRequestAt) existing.lastRequestAt = row.created_at
      if (!existing.email && row.customer_email) existing.email = row.customer_email
      if (!existing.whatsapp && row.whatsapp_phone) existing.whatsapp = row.whatsapp_phone
    } else {
      clients.set(key, {
        key,
        name: row.customer_name,
        email: row.customer_email ?? null,
        phone: row.customer_phone,
        whatsapp: row.whatsapp_phone ?? null,
        requestsCount: 1,
        lastRequestAt: row.created_at,
      })
    }
  }

  return Array.from(clients.values()).sort((a, b) => b.lastRequestAt.localeCompare(a.lastRequestAt))
}

// --- Statistics -----------------------------------------------------------
//
// Every number below comes from a real count/aggregation over
// parts_requests / vehicle_requests / parts_request_items /
// request_status_history — nothing here is simulated. avgProcessingHours is
// null (never 0 or a made-up number) when there isn't yet a single request
// with a tracked transition into a resolved status to average over.

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function startOfWeek(d: Date): Date {
  const copy = startOfDay(d)
  const day = copy.getDay()
  const diff = (day + 6) % 7 // days since Monday
  copy.setDate(copy.getDate() - diff)
  return copy
}

function startOfMonth(d: Date): Date {
  const copy = startOfDay(d)
  copy.setDate(1)
  return copy
}

export type AdminStatistics = {
  parts: { today: number; thisWeek: number; thisMonth: number; total: number }
  vehicles: { today: number; thisWeek: number; thisMonth: number; total: number }
  partsByStatus: { status: string; count: number }[]
  vehiclesByStatus: { status: string; count: number }[]
  topMakes: { make: string; count: number }[]
  topCategories: { category: string; count: number }[]
  avgProcessingHours: number | null
}

export async function getAdminStatistics(): Promise<AdminStatistics> {
  const supabase = await createSupabaseServerClient()

  const now = new Date()
  const today = startOfDay(now).toISOString()
  const week = startOfWeek(now).toISOString()
  const month = startOfMonth(now).toISOString()

  const partsBase = () => supabase.from('parts_requests').select('id', { count: 'exact', head: true })
  const vehiclesBase = () => supabase.from('vehicle_requests').select('id', { count: 'exact', head: true })

  const [
    partsTotal,
    partsToday,
    partsWeek,
    partsMonth,
    vehiclesTotal,
    vehiclesToday,
    vehiclesWeek,
    vehiclesMonth,
    ...partsStatusCounts
  ] = await Promise.all([
    partsBase(),
    partsBase().gte('created_at', today),
    partsBase().gte('created_at', week),
    partsBase().gte('created_at', month),
    vehiclesBase(),
    vehiclesBase().gte('created_at', today),
    vehiclesBase().gte('created_at', week),
    vehiclesBase().gte('created_at', month),
    ...REQUEST_STATUSES.map((status) => partsBase().eq('status', status)),
  ])

  const vehicleStatusCounts = await Promise.all(VEHICLE_REQUEST_STATUSES.map((status) => vehiclesBase().eq('status', status)))

  const partsByStatus = REQUEST_STATUSES.map((status, i) => ({ status, count: partsStatusCounts[i].count ?? 0 }))
  const vehiclesByStatus = VEHICLE_REQUEST_STATUSES.map((status, i) => ({ status, count: vehicleStatusCounts[i].count ?? 0 }))

  const [{ data: vehicleMakeRows }, { data: requestMakeRows }, { data: categoryRows }] = await Promise.all([
    supabase.from('vehicle_requests').select('make').limit(500),
    supabase.from('parts_requests').select('vehicles(make)').limit(500),
    supabase.from('parts_request_items').select('category').limit(1000),
  ])

  const makeCounts = new Map<string, number>()
  for (const row of vehicleMakeRows ?? []) {
    const make = (row as { make: string | null }).make
    if (make) makeCounts.set(make, (makeCounts.get(make) ?? 0) + 1)
  }
  for (const row of requestMakeRows ?? []) {
    // Supabase's generic (non-generated-types) inference reports this
    // embedded relationship as an array even though vehicle_id -> vehicles
    // is many-to-one — same caveat as getPartsRequestDetail's `unknown`
    // cast above.
    const vehicle = (row as unknown as { vehicles: { make: string } | null }).vehicles
    if (vehicle?.make) makeCounts.set(vehicle.make, (makeCounts.get(vehicle.make) ?? 0) + 1)
  }
  const topMakes = Array.from(makeCounts.entries())
    .map(([make, count]) => ({ make, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const categoryCounts = new Map<string, number>()
  for (const row of categoryRows ?? []) {
    const category = (row as { category: string }).category
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
  }
  // Unlike topMakes (free text, can be many distinct values), there are
  // only PART_CATEGORY_KEYS.length (10) possible categories — no slice, so
  // the Pièces page's per-category demand section can show every category,
  // not just a "top 8" that would arbitrarily hide the two smallest.
  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  // Average processing time: the elapsed time between a parts_request's own
  // created_at and the first time it was moved into a resolved status
  // ('parts_found' or 'closed'), per the request_status_history audit trail.
  // vehicle_requests has no equivalent history table yet (see
  // vehicleRequestDetail.historyNotTracked), so this is parts-requests only.
  const { data: historyRows } = await supabase
    .from('request_status_history')
    .select('request_id, new_status, created_at')
    .in('new_status', ['parts_found', 'closed'])
    .order('created_at', { ascending: true })

  let avgProcessingHours: number | null = null
  if (historyRows && historyRows.length > 0) {
    const firstResolutionByRequest = new Map<string, string>()
    for (const row of historyRows) {
      const requestId = row.request_id as string
      if (!firstResolutionByRequest.has(requestId)) firstResolutionByRequest.set(requestId, row.created_at as string)
    }
    const ids = Array.from(firstResolutionByRequest.keys())
    const { data: requestRows } = await supabase.from('parts_requests').select('id, created_at').in('id', ids)

    const durationsMs: number[] = []
    for (const request of requestRows ?? []) {
      const resolvedAt = firstResolutionByRequest.get(request.id as string)
      if (!resolvedAt) continue
      const durationMs = new Date(resolvedAt).getTime() - new Date(request.created_at as string).getTime()
      if (durationMs > 0) durationsMs.push(durationMs)
    }
    if (durationsMs.length > 0) {
      const avgMs = durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length
      avgProcessingHours = Math.round((avgMs / 3_600_000) * 10) / 10
    }
  }

  return {
    parts: { today: partsToday.count ?? 0, thisWeek: partsWeek.count ?? 0, thisMonth: partsMonth.count ?? 0, total: partsTotal.count ?? 0 },
    vehicles: {
      today: vehiclesToday.count ?? 0,
      thisWeek: vehiclesWeek.count ?? 0,
      thisMonth: vehiclesMonth.count ?? 0,
      total: vehiclesTotal.count ?? 0,
    },
    partsByStatus,
    vehiclesByStatus,
    topMakes,
    topCategories,
    avgProcessingHours,
  }
}
