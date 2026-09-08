import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Request numbers are always assigned server-side — the browser must never
// be trusted to generate or supply one.
export async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `DA-${year}-`

  const { data, error } = await supabaseAdmin
    .from('parts_requests')
    .select('request_number')
    .like('request_number', `${prefix}%`)
    .order('request_number', { ascending: false })
    .limit(1)

  if (error) throw error

  const lastNumber = data?.[0]?.request_number as string | undefined
  const lastSequence = lastNumber ? parseInt(lastNumber.slice(prefix.length), 10) : 0
  const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1

  return `${prefix}${String(nextSequence).padStart(6, '0')}`
}
