import { redirect } from 'next/navigation'
import { getCurrentLocale, getCurrentTheme } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { LoginForm } from './login-form'

export default async function AdminLoginPage() {
  const locale = await getCurrentLocale()
  const theme = await getCurrentTheme()
  const dict = await getDictionary(locale)

  // If there's already a valid admin session, skip the form entirely.
  // Non-admin sessions fall through to the form below rather than looping —
  // requireAdmin() (used everywhere else) is what actually enforces access.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: isAdmin } = await supabase.rpc('is_admin')
    if (isAdmin) redirect('/admin')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Soft ambient glow behind the card — subtle, not a hero background. */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />

      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Tight crop (see site-header.tsx / admin-shell.tsx) instead of
            the padded master — same box height, visibly bigger glyph.
            dakar-auto-logo-header.png's DAKAR/WEB wordmark is near-white —
            illegible on this page's light-theme bg-background, same issue
            admin-shell.tsx already works around with the "-light" variant
            (same crop/size, just the white elements darkened to graphite). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={theme === 'light' ? '/brand/dakar-auto-logo-header-light.png' : '/brand/dakar-auto-logo-header.png'}
          alt="Dakar Auto"
          className="h-16 w-auto"
        />
        <LoginForm dict={dict} />
      </div>
    </div>
  )
}
