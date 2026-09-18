'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { requireAdmin } from '@/src/services/admin/auth'
import type { SettingsActionState } from '@/src/services/admin/actions'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Accepts "instagram.com/dakarauto" as readily as
// "https://instagram.com/dakarauto" — auto-prepending https:// before
// validating is friendlier than rejecting a URL just because an admin
// didn't type the scheme, and still produces a real, working absolute URL
// for the public site's <a href> to use.
function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    return new URL(withScheme).toString()
  } catch {
    return null
  }
}

export async function updateSiteSettingsAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  await requireAdmin()

  const contactEmail = String(formData.get('contactEmail') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const whatsapp = String(formData.get('whatsapp') ?? '').trim()
  const instagramRaw = String(formData.get('instagramUrl') ?? '').trim()
  const facebookRaw = String(formData.get('facebookUrl') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()

  const showContactEmail = formData.get('showContactEmail') === 'on'
  const showPhone = formData.get('showPhone') === 'on'
  const showWhatsapp = formData.get('showWhatsapp') === 'on'
  const showInstagram = formData.get('showInstagram') === 'on'
  const showFacebook = formData.get('showFacebook') === 'on'
  const showAddress = formData.get('showAddress') === 'on'

  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    return { status: 'error', error: 'invalid_email' }
  }

  const instagramUrl = normalizeUrl(instagramRaw)
  if (instagramUrl === null) return { status: 'error', error: 'invalid_instagram_url' }

  const facebookUrl = normalizeUrl(facebookRaw)
  if (facebookUrl === null) return { status: 'error', error: 'invalid_facebook_url' }

  const supabase = await createSupabaseServerClient()
  // `.select().maybeSingle()` surfaces an RLS-filtered write (0 rows, no
  // error) as a real failure instead of a false "saved" — same guard used
  // by every other Settings write in this project.
  const { data: updated, error } = await supabase
    .from('site_settings')
    .update({
      contact_email: contactEmail || null,
      show_contact_email: showContactEmail,
      phone: phone || null,
      show_phone: showPhone,
      whatsapp: whatsapp || null,
      show_whatsapp: showWhatsapp,
      instagram_url: instagramUrl || null,
      show_instagram: showInstagram,
      facebook_url: facebookUrl || null,
      show_facebook: showFacebook,
      address: address || null,
      show_address: showAddress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('id')
    .maybeSingle()

  if (error || !updated) {
    // Real cause stays server-side only — the client only ever sees the
    // generic 'update_failed' error code below. See supabase/migrations/
    // 20260915090000_grant_site_settings_authenticated.sql for the actual
    // root cause this surfaced once (a missing base-level Postgres GRANT,
    // not an RLS/is_admin() bug).
    if (error) {
      console.error('[site-settings] Failed to update site settings:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
    } else {
      console.error('[site-settings] Update returned no row — likely RLS-filtered the write (0 rows affected).')
    }
    return { status: 'error', error: 'update_failed' }
  }

  // The root layout (footer) and homepage (contact section) render this
  // data server-side — revalidate the whole public tree so the new values
  // show up on the very next request instead of waiting for it to fall out
  // of Next's cache on its own.
  revalidatePath('/', 'layout')

  return { status: 'success' }
}
