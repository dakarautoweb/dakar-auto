import 'server-only'
import type OpenAI from 'openai'
import { vehicleDetailHref } from '@/src/lib/chat/routes'
import type { PublicVehicleSummary } from '@/src/services/inventory/types'

// The assistant's only tool: a read-only search over the vehicles already
// published on /vehicles. It runs through the same public query the page
// uses (getPublicVehicles — available/reserved only, public fields only),
// filters in code, and returns a fixed, small set of fields. There is no
// generic database access and no request/customer lookup of any kind.

export const SEARCH_PUBLIC_VEHICLES = 'search_public_vehicles'
const MAX_RESULTS = 5

export const CHAT_TOOLS: OpenAI.Responses.FunctionTool[] = [
  {
    type: 'function',
    name: SEARCH_PUBLIC_VEHICLES,
    description:
      'Search the vehicles currently published for sale on the Dakar Auto website. Returns at most 5 matches with public fields only. Use null for any filter the customer did not give.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['make', 'model', 'min_year', 'max_year', 'max_price', 'transmission'],
      properties: {
        make: { type: ['string', 'null'], description: 'Brand, e.g. "Honda".' },
        model: { type: ['string', 'null'], description: 'Model, e.g. "CR-V".' },
        min_year: { type: ['integer', 'null'] },
        max_year: { type: ['integer', 'null'] },
        max_price: { type: ['number', 'null'], description: 'Maximum price in the listing currency (usually XOF).' },
        transmission: { type: ['string', 'null'], enum: ['automatic', 'manual', null] },
      },
    },
  },
]

export type VehicleSearchArgs = {
  make: string | null
  model: string | null
  min_year: number | null
  max_year: number | null
  max_price: number | null
  transmission: 'automatic' | 'manual' | null
}

export type VehicleSearchResult = {
  matches: number
  vehicles: {
    id: string
    make: string
    model: string
    year: number
    mileage_km: number | null
    transmission: string | null
    engine: string | null
    color: string | null
    price: number | null
    currency: string
    status: string
    page: string
  }[]
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseArgs(raw: string): VehicleSearchArgs {
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(raw) ?? {}
  } catch {
    // Treated as "no filters".
  }
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null)
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    make: text(parsed.make),
    model: text(parsed.model),
    min_year: num(parsed.min_year),
    max_year: num(parsed.max_year),
    max_price: num(parsed.max_price),
    transmission: parsed.transmission === 'automatic' || parsed.transmission === 'manual' ? parsed.transmission : null,
  }
}

// Stored transmissions are free text in either language ("Automatique",
// "Automatic", "Manuelle", "Manual").
function transmissionMatches(stored: string | null, wanted: 'automatic' | 'manual'): boolean {
  if (!stored) return false
  return fold(stored).startsWith(wanted === 'automatic' ? 'auto' : 'manu')
}

export function filterPublicVehicles(vehicles: PublicVehicleSummary[], args: VehicleSearchArgs): VehicleSearchResult {
  const matches = vehicles.filter(
    (v) =>
      (!args.make || fold(v.make).includes(fold(args.make))) &&
      (!args.model || fold(v.model).includes(fold(args.model))) &&
      (args.min_year === null || v.year >= args.min_year) &&
      (args.max_year === null || v.year <= args.max_year) &&
      (args.max_price === null || (v.price !== null && v.price <= args.max_price)) &&
      (!args.transmission || transmissionMatches(v.transmission, args.transmission)),
  )
  return {
    matches: matches.length,
    vehicles: matches.slice(0, MAX_RESULTS).map((v) => ({
      id: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      mileage_km: v.mileage,
      transmission: v.transmission,
      engine: v.engineDisplacement,
      color: v.color,
      price: v.price,
      currency: v.currency,
      status: v.status,
      page: vehicleDetailHref(v.id),
    })),
  }
}

export async function runVehicleSearch(rawArgs: string, loadVehicles: () => Promise<PublicVehicleSummary[]>): Promise<VehicleSearchResult> {
  return filterPublicVehicles(await loadVehicles(), parseArgs(rawArgs))
}
