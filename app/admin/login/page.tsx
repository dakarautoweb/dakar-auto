import { redirect } from 'next/navigation'
import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { LoginForm } from './login-form'

export default async function AdminLoginPage() {
  const locale = await getCurrentLocale()
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <LoginForm dict={dict} />
    </div>
  )
}
