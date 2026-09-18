'use client'

import { useActionState, useState } from 'react'
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { loginAdminAction, requestPasswordResetByEmailAction, type LoginState, type SettingsActionState } from '@/src/services/admin/actions'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import { IconInput } from '@/src/components/admin/icon-input'
import { PasswordInput } from '@/src/components/admin/password-input'

const initialState: LoginState = { error: null }
const idleReset: SettingsActionState = { status: 'idle' }

// Compact "forgot password" block shown inside the login card in place of
// the login form. Reuses the real requestPasswordResetByEmailAction (which
// itself calls the same resetPasswordForEmail() the Settings page does) —
// never a client-only/fake success.
function ForgotPasswordBlock({ dict, onBackToLogin }: { dict: Dictionary; onBackToLogin: () => void }) {
  const t = dict.admin.login
  const [state, action, pending] = useActionState(requestPasswordResetByEmailAction, idleReset)

  if (state.status === 'success') {
    return (
      <div className={cardClasses({ padding: 'md', className: 'mt-6 w-full' })}>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.75} />
          <p className="mt-3 text-sm font-medium text-foreground">{t.resetLinkSent}</p>
        </div>
        <button
          type="button"
          onClick={onBackToLogin}
          className={buttonClasses({ variant: 'secondary', size: 'md', fullWidth: true, pill: true, className: 'mt-6' })}
        >
          {t.backToLogin}
        </button>
      </div>
    )
  }

  return (
    <div className={cardClasses({ padding: 'md', className: 'mt-6 w-full' })}>
      <h1 className="text-center text-xl font-bold tracking-tight">{t.forgotPasswordTitle}</h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">{t.forgotPasswordSubtitle}</p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.emailLabel}
          </label>
          <IconInput icon={Mail} id="forgot-email" name="email" type="email" autoComplete="email" required />
        </div>

        {state.status === 'error' && (
          <p className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {state.error === 'invalid_email' ? t.errorInvalidEmail : t.errorSendFailed}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, pill: true })}>
          {pending ? t.sendingResetLink : t.sendResetLink}
        </button>
      </form>

      <button
        type="button"
        onClick={onBackToLogin}
        className="mt-4 block w-full text-center text-sm font-medium text-muted-foreground transition duration-150 hover:text-accent"
      >
        {t.backToLogin}
      </button>
    </div>
  )
}

export function LoginForm({ dict }: { dict: Dictionary }) {
  const [state, action, pending] = useActionState(loginAdminAction, initialState)
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const t = dict.admin.login

  const errorMessage =
    state.error === 'missing_fields'
      ? t.errorMissingFields
      : state.error === 'not_admin'
        ? t.errorNotAdmin
        : state.error === 'invalid_credentials'
          ? t.errorInvalidCredentials
          : null

  if (mode === 'forgot') {
    return <ForgotPasswordBlock dict={dict} onBackToLogin={() => setMode('login')} />
  }

  return (
    <div className={cardClasses({ padding: 'md', className: 'mt-6 w-full' })}>
      <h1 className="text-center text-xl font-bold tracking-tight">{t.title}</h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">{t.subtitle}</p>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.emailLabel}
          </label>
          <IconInput icon={Mail} id="admin-email" name="email" type="email" autoComplete="email" required />
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.passwordLabel}
          </label>
          <PasswordInput
            id="admin-password"
            name="password"
            autoComplete="current-password"
            required
            showLabel={t.showPassword}
            hideLabel={t.hidePassword}
          />
          <div className="mt-1.5 flex justify-end">
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-xs font-medium text-muted-foreground transition duration-150 hover:text-accent"
            >
              {t.forgotPasswordLink}
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {errorMessage}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, pill: true })}>
          {pending ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  )
}
