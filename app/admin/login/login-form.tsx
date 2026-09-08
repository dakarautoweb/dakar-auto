'use client'

import { useActionState } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { loginAdminAction, type LoginState } from '@/src/services/admin/actions'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30'

const initialState: LoginState = { error: null }

export function LoginForm({ dict }: { dict: Dictionary }) {
  const [state, action, pending] = useActionState(loginAdminAction, initialState)

  const errorMessage =
    state.error === 'missing_fields'
      ? dict.admin.login.errorMissingFields
      : state.error === 'not_admin'
        ? dict.admin.login.errorNotAdmin
        : state.error === 'invalid_credentials'
          ? dict.admin.login.errorInvalidCredentials
          : null

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/60 p-8 shadow-md">
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        <span className="text-lg font-bold tracking-tight">
          Dakar Auto <span className="text-accent">Admin</span>
        </span>
      </div>

      <h1 className="text-xl font-bold tracking-tight">{dict.admin.login.title}</h1>

      <form action={action} className="mt-6 space-y-4">
        <div>
          <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.admin.login.emailLabel}
          </label>
          <input id="admin-email" name="email" type="email" autoComplete="email" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            {dict.admin.login.passwordLabel}
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </div>

        {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? dict.admin.login.submitting : dict.admin.login.submit}
        </button>
      </form>
    </div>
  )
}
