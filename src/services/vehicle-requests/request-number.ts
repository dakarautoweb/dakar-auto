import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Request numbers are always assigned server-side — the browser must never
// be trusted to generate or supply one. Mirrors requests/request-number.ts
// but with a VR- prefix instead of DA-; both share the same
// public.next_request_number() counter mechanism, keyed independently per
// prefix so the two number sequences never interfere with each other.
export async function generateVehicleRequestNumber(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('next_request_number', { p_prefix: 'VR' })
  if (error) throw error
  return data as string
}
