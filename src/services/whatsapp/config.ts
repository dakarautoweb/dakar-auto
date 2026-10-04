import 'server-only'
import type { Locale } from '@/src/i18n/config'

// Server-only on purpose: none of these may ever be exposed through a
// NEXT_PUBLIC_* variable or reach a Client Component. See
// docs/whatsapp-cloud-api.md for the Meta setup.
//
// Read at call time (not module load) so a missing variable can be fixed
// without code changes and tests can vary it.

const DEFAULT_GRAPH_API_VERSION = 'v23.0'

export type WhatsAppTemplateConfig = { name: string; language: string }

export type WhatsAppConfig = {
  token: string
  phoneNumberId: string
  graphApiVersion: string
  templates: Record<Locale, WhatsAppTemplateConfig>
}

export type WhatsAppConfigResult = { ok: true; config: WhatsAppConfig } | { ok: false; missing: string[] }

// Each request type has its own approved template (different wording) and
// its own env variables, so a missing vehicle template never disables the
// parts confirmation, or vice versa.
export type WhatsAppTemplateSet = 'parts_request' | 'vehicle_request' | 'status' | 'vehicle_found'

const TEMPLATE_ENV_PREFIX: Record<WhatsAppTemplateSet, string> = {
  parts_request: 'WHATSAPP_TEMPLATE',
  vehicle_request: 'WHATSAPP_VEHICLE_TEMPLATE',
  status: 'WHATSAPP_STATUS_TEMPLATE',
  vehicle_found: 'WHATSAPP_VEHICLE_FOUND_TEMPLATE',
}

function env(name: string): string {
  return process.env[name]?.trim() ?? ''
}

export function getWhatsAppConfig(templateSet: WhatsAppTemplateSet = 'parts_request'): WhatsAppConfigResult {
  const prefix = TEMPLATE_ENV_PREFIX[templateSet]
  const nameFr = `${prefix}_NAME_FR`
  const languageFr = `${prefix}_LANGUAGE_FR`
  const nameEn = `${prefix}_NAME_EN`
  const languageEn = `${prefix}_LANGUAGE_EN`
  const values: Record<string, string> = {
    WHATSAPP_CLOUD_API_TOKEN: env('WHATSAPP_CLOUD_API_TOKEN'),
    WHATSAPP_PHONE_NUMBER_ID: env('WHATSAPP_PHONE_NUMBER_ID'),
    [nameFr]: env(nameFr),
    [languageFr]: env(languageFr),
    [nameEn]: env(nameEn),
    [languageEn]: env(languageEn),
  }

  // Only variable names are reported, never values.
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) return { ok: false, missing }

  return {
    ok: true,
    config: {
      token: values.WHATSAPP_CLOUD_API_TOKEN,
      phoneNumberId: values.WHATSAPP_PHONE_NUMBER_ID,
      graphApiVersion: env('WHATSAPP_GRAPH_API_VERSION') || DEFAULT_GRAPH_API_VERSION,
      templates: {
        fr: { name: values[nameFr], language: values[languageFr] },
        en: { name: values[nameEn], language: values[languageEn] },
      },
    },
  }
}
