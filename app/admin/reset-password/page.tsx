import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { getCurrentLocale, getCurrentTheme } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { ResetPasswordForm } from './reset-password-form'

// Landing page for the Supabase password-recovery email link. /auth/callback
// exchanges the link's recovery code for a real session *before* redirecting
// here, so the only thing this page needs to decide is: does a session
// actually exist right now? That's the ONE authoritative "is this link
// valid" check, and it only matters here, on the very first render — before
// the reset flow has run. It's passed down as `hasSession` and captured
// once by the client form (see reset-password-form.tsx for why): a
// successful password update signs the recovery session out server-side,
// which would otherwise make this exact check flip to false and misrender
// as an invalid link right after a successful change. Deciding the
// valid/invalid branch here on every render (as before) is what caused
// that bug — the branch now lives entirely in the client component.
export default async function AdminResetPasswordPage() {
  const locale = await getCurrentLocale()
  const theme = await getCurrentTheme()
  const dict = await getDictionary(locale)

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Soft ambient glow behind the card — same treatment as /admin/login. */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />

      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Tight crop (see site-header.tsx / admin-shell.tsx) instead of
            the padded master — same box height, visibly bigger glyph. Same
            theme-aware asset swap as /admin/login (see that page's comment):
            the header logo's wordmark is near-white and illegible on the
            light theme's background. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={theme === 'light' ? '/brand/dakar-auto-logo-header-light.png' : '/brand/dakar-auto-logo-header.png'}
          alt="Dakar Auto"
          className="h-16 w-auto"
        />
        <ResetPasswordForm dict={dict} hasSession={Boolean(user)} />
      </div>
    </div>
  )
}
