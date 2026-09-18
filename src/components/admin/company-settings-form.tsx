'use client'

import { useActionState } from 'react'
import type { ComponentType } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { updateSiteSettingsAction } from '@/src/services/site-settings/actions'
import type { SiteSettings } from '@/src/services/site-settings/types'
import type { SettingsActionState } from '@/src/services/admin/actions'
import { buttonClasses } from '@/src/components/ui/styles'
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from '@/src/components/home/icons'
import { IconInput } from './icon-input'
import { StatusLine } from './account-settings-forms'

const idle: SettingsActionState = { status: 'idle' }

function FieldRow({
  icon: Icon,
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  showName,
  defaultShow,
  showLabel,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  name: string
  type?: string
  defaultValue: string
  placeholder: string
  showName: string
  defaultShow: boolean
  showLabel: string
}) {
  return (
    <div>
      <label htmlFor={`company-${name}`} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <IconInput icon={Icon} id={`company-${name}`} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="w-full" />
      <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 py-2.5 text-sm text-muted-foreground select-none">
        <input type="checkbox" name={showName} defaultChecked={defaultShow} className="h-4 w-4 accent-accent" />
        {showLabel}
      </label>
    </div>
  )
}

// Real, saved settings — every field maps 1:1 to a column on the
// public.site_settings singleton row (see the migration), submitted and
// persisted together by one form/one action, not per-field like the
// account forms above it on this page. This is Dakar Auto's *public*
// contact info (footer, homepage contact section, WhatsApp/phone/email
// CTAs) — deliberately unrelated to the signed-in admin's own login email
// in the Compte section above.
export function CompanySettingsForm({ dict, settings }: { dict: Dictionary; settings: SiteSettings }) {
  const t = dict.admin.settingsPage.companySection
  const [state, action, pending] = useActionState(updateSiteSettingsAction, idle)
  const errorMap = {
    invalid_email: dict.admin.settingsPage.errorInvalidEmail,
    invalid_instagram_url: t.errorInvalidUrl,
    invalid_facebook_url: t.errorInvalidUrl,
    update_failed: dict.admin.settingsPage.errorUpdateFailed,
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FieldRow
          icon={Mail}
          label={t.emailLabel}
          name="contactEmail"
          type="email"
          defaultValue={settings.contactEmail}
          placeholder={t.emailPlaceholder}
          showName="showContactEmail"
          defaultShow={settings.showContactEmail}
          showLabel={t.showOnSite}
        />
        <FieldRow
          icon={Phone}
          label={t.phoneLabel}
          name="phone"
          defaultValue={settings.phone}
          placeholder={t.phonePlaceholder}
          showName="showPhone"
          defaultShow={settings.showPhone}
          showLabel={t.showOnSite}
        />
        <FieldRow
          icon={WhatsAppIcon}
          label={t.whatsappLabel}
          name="whatsapp"
          defaultValue={settings.whatsapp}
          placeholder={t.whatsappPlaceholder}
          showName="showWhatsapp"
          defaultShow={settings.showWhatsapp}
          showLabel={t.showOnSite}
        />
        <FieldRow
          icon={InstagramIcon}
          label={t.instagramLabel}
          name="instagramUrl"
          defaultValue={settings.instagramUrl}
          placeholder={t.instagramPlaceholder}
          showName="showInstagram"
          defaultShow={settings.showInstagram}
          showLabel={t.showOnSite}
        />
        <FieldRow
          icon={FacebookIcon}
          label={t.facebookLabel}
          name="facebookUrl"
          defaultValue={settings.facebookUrl}
          placeholder={t.facebookPlaceholder}
          showName="showFacebook"
          defaultShow={settings.showFacebook}
          showLabel={t.showOnSite}
        />
        <FieldRow
          icon={MapPin}
          label={t.addressLabel}
          name="address"
          defaultValue={settings.address}
          placeholder={t.addressPlaceholder}
          showName="showAddress"
          defaultShow={settings.showAddress}
          showLabel={t.showOnSite}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClasses({ variant: 'secondary', size: 'md' })}>
          {pending ? t.saving : t.save}
        </button>
        <StatusLine state={state} successMessage={t.saved} errorMap={errorMap} />
      </div>
    </form>
  )
}
