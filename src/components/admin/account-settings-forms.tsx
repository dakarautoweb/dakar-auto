'use client'

import { useActionState } from 'react'
import { User, Mail, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import {
  updateAdminNameAction,
  updateAdminEmailAction,
  changeAdminPasswordAction,
  requestAdminPasswordResetAction,
  type SettingsActionState,
} from '@/src/services/admin/actions'
import { buttonClasses } from '@/src/components/ui/styles'
import { IconInput } from './icon-input'
import { PasswordInput } from './password-input'

const idle: SettingsActionState = { status: 'idle' }

export function StatusLine({ state, successMessage, errorMap }: { state: SettingsActionState; successMessage: string; errorMap: Record<string, string> }) {
  if (state.status === 'success') {
    return (
      <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
        {state.message ?? successMessage}
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
        {errorMap[state.error] ?? errorMap.update_failed}
      </p>
    )
  }
  return null
}

export function NameForm({ dict, currentName }: { dict: Dictionary; currentName: string }) {
  const t = dict.admin.settingsPage
  const [state, action, pending] = useActionState(updateAdminNameAction, idle)
  const errorMap = { missing_name: t.errorMissingName, name_too_long: t.errorNameTooLong, update_failed: t.errorUpdateFailed }

  return (
    <form action={action} className="space-y-2.5">
      <label htmlFor="settings-name" className="block text-xs font-medium text-muted-foreground">
        {t.nameLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <IconInput icon={User} id="settings-name" name="fullName" defaultValue={currentName} required className="sm:flex-1" />
        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
          {pending ? t.savingName : t.saveName}
        </button>
      </div>
      <StatusLine state={state} successMessage={t.nameSaved} errorMap={errorMap} />
    </form>
  )
}

export function EmailForm({ dict, currentEmail }: { dict: Dictionary; currentEmail: string }) {
  const t = dict.admin.settingsPage
  const [state, action, pending] = useActionState(updateAdminEmailAction, idle)
  const errorMap = { invalid_email: t.errorInvalidEmail, update_failed: t.errorUpdateFailed }

  return (
    <form action={action} className="space-y-2.5">
      <label htmlFor="settings-email" className="block text-xs font-medium text-muted-foreground">
        {t.emailLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <IconInput icon={Mail} id="settings-email" name="email" type="email" defaultValue={currentEmail} required className="sm:flex-1" />
        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
          {pending ? t.savingEmail : t.saveEmail}
        </button>
      </div>
      <StatusLine state={state} successMessage={t.emailPending} errorMap={errorMap} />
    </form>
  )
}

export function PasswordForm({ dict }: { dict: Dictionary }) {
  const t = dict.admin.settingsPage
  const [state, action, pending] = useActionState(changeAdminPasswordAction, idle)
  const errorMap = {
    password_too_short: t.errorPasswordTooShort,
    password_mismatch: t.errorPasswordMismatch,
    update_failed: t.errorUpdateFailed,
  }

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="settings-new-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t.newPasswordLabel}
          </label>
          <PasswordInput
            id="settings-new-password"
            name="password"
            autoComplete="new-password"
            required
            showLabel={dict.admin.login.showPassword}
            hideLabel={dict.admin.login.hidePassword}
          />
        </div>
        <div>
          <label htmlFor="settings-confirm-password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            {t.confirmPasswordLabel}
          </label>
          <PasswordInput
            id="settings-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            showLabel={dict.admin.login.showPassword}
            hideLabel={dict.admin.login.hidePassword}
          />
        </div>
      </div>
      <button type="submit" disabled={pending} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
        {pending ? t.savingPassword : t.savePassword}
      </button>
      <StatusLine state={state} successMessage={t.passwordSaved} errorMap={errorMap} />
    </form>
  )
}

export function ResetPasswordCard({ dict }: { dict: Dictionary }) {
  const t = dict.admin.settingsPage
  const [state, action, pending] = useActionState(requestAdminPasswordResetAction, idle)
  const errorMap = { update_failed: t.errorUpdateFailed }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <KeyRound className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          {t.forgotPasswordTitle}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t.forgotPasswordDescription}</p>
        <div className="mt-1.5">
          <StatusLine state={state} successMessage={t.resetLinkSent} errorMap={errorMap} />
        </div>
      </div>
      <form action={action}>
        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'secondary-muted', size: 'sm' })}>
          {pending ? t.sendingResetLink : t.sendResetLink}
        </button>
      </form>
    </div>
  )
}
