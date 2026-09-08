import 'server-only'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import type { RequestStatus } from './statuses'
import type { VehicleRequestStatus } from './vehicle-request-statuses'

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
  vehicles: {
    id: string
    vin: string | null
    year: number | null
    make: string
    model: string
  } | null
  parts_request_items: { category: string; part_name: string }[]
}

export type PartsRequestFilters = {
  search?: string
  status?: RequestStatus | 'all'
  sort?: 'newest' | 'oldest'
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
      'id, request_number, created_at, status, customer_name, customer_phone, customer_email, preferred_contact_method, locale, vehicle_id, vehicles(id, vin, year, make, model), parts_request_items(category, part_name)'
    )
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .limit(200)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

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

  const base = () => supabase.from('parts_requests').select('id', { count: 'exact', head: true })

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
       whatsapp_phone, whatsapp_same_as_phone, preferred_contact_method, admin_notes,
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
  make: string | null
  model: string | null
  year_from: number | null
  year_to: number | null
}

export type VehicleRequestFilters = {
  search?: string
  status?: VehicleRequestStatus | 'all'
  sort?: 'newest' | 'oldest'
}

export async function listVehicleRequests(filters: VehicleRequestFilters = {}): Promise<VehicleRequestRow[]> {
  const supabase = await createSupabaseServerClient()
  const search = filters.search ? sanitizeSearchTerm(filters.search) : ''

  let query = supabase
    .from('vehicle_requests')
    .select(
      'id, request_number, created_at, status, customer_name, customer_phone, customer_email, make, model, year_from, year_to'
    )
    .order('created_at', { ascending: filters.sort === 'oldest' })
    .limit(200)

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

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
}

export async function getVehicleRequestDetail(id: string): Promise<VehicleRequestDetail | null> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('vehicle_requests')
    .select(
      `id, request_number, created_at, status, locale, customer_name, customer_phone, customer_email,
       whatsapp_phone, preferred_contact_method, admin_notes,
       make, model, year_from, year_to, color, engine, transmission,
       mileage_min, mileage_max, trim_level, budget_min, budget_max, currency, other_preferences`
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

  const base = () => supabase.from('vehicle_requests').select('id', { count: 'exact', head: true })

  const [total, today] = await Promise.all([base(), base().gte('created_at', startOfToday.toISOString())])

  return {
    total: total.count ?? 0,
    today: today.count ?? 0,
  }
}
