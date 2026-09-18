import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { requireAdmin } from '@/src/services/admin/auth'
import { EMPTY_PUBLIC_SITE_SETTINGS, EMPTY_SITE_SETTINGS, type PublicSiteSettings, type SiteSettings } from './types'

// Admin -> Paramètres prefill: the full row, including whichever fields
// are currently toggled hidden. Requires an authenticated admin (same
// requireAdmin() gate every other Settings query/action uses) and is
// additionally enforced by the "Admins can read site settings" RLS policy.
export async function getAdminSiteSettings(): Promise<SiteSettings> {
  await requireAdmin()

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()

  if (error) {
    console.error('[site-settings] Failed to load admin site settings:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
  }
  if (error || !data) return EMPTY_SITE_SETTINGS

  return {
    contactEmail: data.contact_email ?? '',
    showContactEmail: Boolean(data.show_contact_email),
    phone: data.phone ?? '',
    showPhone: Boolean(data.show_phone),
    whatsapp: data.whatsapp ?? '',
    showWhatsapp: Boolean(data.show_whatsapp),
    instagramUrl: data.instagram_url ?? '',
    showInstagram: Boolean(data.show_instagram),
    facebookUrl: data.facebook_url ?? '',
    showFacebook: Boolean(data.show_facebook),
    address: data.address ?? '',
    showAddress: Boolean(data.show_address),
    updatedAt: data.updated_at ?? null,
  }
}

// Public site read path — the ONLY one. Calls the get_public_site_settings()
// SECURITY DEFINER function (see the migration) instead of selecting from
// public.site_settings directly: that function already nulls out every
// field whose show_* flag is off, so "hidden" is enforced in the database,
// not by this function remembering to filter correctly. Uses the same
// anon-capable RLS-respecting client as every other public read in this
// project — never the service-role key.
//
// Wrapped in React's cache() so every public component that needs this on
// the same request (footer + homepage contact section, for example) shares
// one DB round trip instead of each firing its own.
//
// Never throws: if the table/function doesn't exist yet (migration not
// applied) or the query otherwise fails, this returns "everything hidden"
// rather than crashing the public site or silently falling back to old
// placeholder data.
export const getPublicSiteSettings = cache(async (): Promise<PublicSiteSettings> => {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('get_public_site_settings').maybeSingle()

    if (error || !data) return EMPTY_PUBLIC_SITE_SETTINGS

    // No generated Database types are wired into this project's Supabase
    // client (see src/lib/supabase/auth-server.ts) — every `.from()`/`.rpc()`
    // call is untyped for the same reason; cast this one row explicitly
    // rather than reaching for the `any` it would otherwise silently be.
    const row = data as {
      contact_email: string | null
      phone: string | null
      whatsapp: string | null
      instagram_url: string | null
      facebook_url: string | null
      address: string | null
    }

    return {
      email: row.contact_email || null,
      phone: row.phone || null,
      whatsapp: row.whatsapp || null,
      instagramUrl: row.instagram_url || null,
      facebookUrl: row.facebook_url || null,
      address: row.address || null,
    }
  } catch (err) {
    console.error('[site-settings] Failed to load public site settings:', err instanceof Error ? err.message : 'Unknown error')
    return EMPTY_PUBLIC_SITE_SETTINGS
  }
})
