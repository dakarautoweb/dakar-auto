import 'server-only'
import { supabaseAdmin } from '@/src/lib/supabase/server'

// Request numbers are always assigned server-side — the browser must never
// be trusted to generate or supply one.
//
// Generation itself is delegated to public.next_request_number(), a
// SECURITY DEFINER Postgres function backed by a row-locked counter table
// (see the migration in the project notes). That makes it atomic under
// concurrency and immune to number reuse after a row is deleted — unlike
// the previous "look at MAX(request_number) among existing rows" approach,
// which could hand out an already-used number once the row that used it
// was gone.
export async function generateRequestNumber(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('next_request_number', { p_prefix: 'DA' })
  if (error) throw error
  return data as string
}
