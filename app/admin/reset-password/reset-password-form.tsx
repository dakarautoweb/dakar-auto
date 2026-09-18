'use client'

import { useActionState, useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { updateRecoveredPasswordAction, type ResetPasswordState } from '@/src/services/admin/actions'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import { PasswordInput } from '@/src/components/admin/password-input'
import { InvalidResetLink } from './invalid-reset-link'

const idle: ResetPasswordState = { status: 'idle' }

// Real recovery-session finalization: this form only ever renders once the
// server component above has confirmed an actual Supabase session exists
// (established by /auth/callback exchanging the recovery code). Submitting
// it calls updateRecoveredPasswordAction, which performs the real
// auth.updateUser({ password }) call — there is no client-only/fake success
// path here.
//
// `hasSession` is the ONE authoritative check ("is this recovery link still
// valid"), decided server-side before this component ever mounts. It's
// captured into state (not read live from the prop on every render) on
// purpose: updateRecoveredPasswordAction signs the recovery session out
// after a successful password change, and submitting a Server Action from
// a client component triggers Next.js to re-render this route's Server
// Component tree — which would re-run that same auth check, now correctly
// see no session, and pass hasSession={false} on the next render. Reading
// the prop live would then swap a just-succeeded flow to "Invalid link"
// right under the user (this was the actual bug). useState(hasSession)
// only ever consults its argument on this component's first render, so a
// later prop change from that post-action refresh is simply ignored —
// once the link has been confirmed valid, whether a session still exists
// stops being the question; whether the update succeeded is.
export function ResetPasswordForm({ dict, hasSession }: { dict: Dictionary; hasSession: boolean }) {
  const t = dict.admin.resetPasswordPage
  const loginT = dict.admin.login
  const [wasSessionValid] = useState(hasSession)
  const [state, action, pending] = useActionState(updateRecoveredPasswordAction, idle)
  const [clientError, setClientError] = useState<string | null>(null)

  // Priority: a successful update always wins, regardless of whether the
  // recovery session is still around afterward. Only when nothing has
  // succeeded (yet) does the original link validity decide what to show.
  if (state.status === 'success') {
    return (
      <div className={cardClasses({ padding: 'md', className: 'mt-6 w-full' })}>
        <div className="flex flex-col items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" strokeWidth={1.75} />
          <h1 className="mt-3 text-xl font-bold tracking-tight">{t.successTitle}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t.successMessage}</p>
        </div>
        <Link href="/admin/login" className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, pill: true, className: 'mt-6' })}>
          {t.backToLogin}
        </Link>
      </div>
    )
  }

  if (!wasSessionValid) {
    return <InvalidResetLink dict={dict} />
  }

  const errorMap: Record<string, string> = {
    password_too_short: t.errorPasswordTooShort,
    password_mismatch: t.errorPasswordMismatch,
    invalid_session: t.errorInvalidSession,
    update_failed: t.errorUpdateFailed,
  }

  // Client-side validation reads straight from the form's own FormData
  // rather than mirroring each field into React state — cheaper, and it
  // lets us call e.preventDefault() to stop the server action from firing
  // at all when validation fails, per spec ("do not send the request").
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (password.length < 8) {
      e.preventDefault()
      setClientError(t.errorPasswordTooShort)
      return
    }
    if (password !== confirmPassword) {
      e.preventDefault()
      setClientError(t.errorPasswordMismatch)
      return
    }
    setClientError(null)
  }

  const displayError = clientError ?? (state.status === 'error' ? errorMap[state.error] ?? errorMap.update_failed : null)

  return (
    <div className={cardClasses({ padding: 'md', className: 'mt-6 w-full' })}>
      <h1 className="text-center text-xl font-bold tracking-tight">{t.title}</h1>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">{t.subtitle}</p>

      <form action={action} onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="reset-new-password" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.newPasswordLabel}
          </label>
          <PasswordInput
            id="reset-new-password"
            name="password"
            autoComplete="new-password"
            required
            showLabel={loginT.showPassword}
            hideLabel={loginT.hidePassword}
          />
        </div>

        <div>
          <label htmlFor="reset-confirm-password" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {t.confirmPasswordLabel}
          </label>
          <PasswordInput
            id="reset-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            showLabel={loginT.showPassword}
            hideLabel={loginT.hidePassword}
          />
        </div>

        {displayError && (
          <p className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {displayError}
          </p>
        )}

        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, pill: true })}>
          {pending ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  )
}
