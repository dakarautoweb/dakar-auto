import 'server-only'
import frDict from '@/src/i18n/dictionaries/fr.json'
import enDict from '@/src/i18n/dictionaries/en.json'
import type { Locale } from '@/src/i18n/config'
import type { PartCondition, PartSide, PreferredContact } from '@/src/services/requests/types'

const dictionaries = { fr: frDict, en: enDict }

export function resolveCategoryLabel(locale: Locale, categoryKey: string): string {
  const dict = dictionaries[locale]
  const category = dict.categories.items.find((item) => item.key === categoryKey)
  return category?.title ?? dict.categories.cantFind.title
}

export function resolveConditionLabel(locale: Locale, condition: PartCondition): string {
  const dict = dictionaries[locale]
  const map: Record<PartCondition, string> = {
    oem: dict.wizard.partDetails.conditionOem,
    aftermarket: dict.wizard.partDetails.conditionAftermarket,
    used: dict.wizard.partDetails.conditionUsed,
    no_preference: dict.wizard.partDetails.conditionNoPreference,
  }
  return map[condition]
}

export function resolveSideLabel(locale: Locale, side: PartSide | null): string | null {
  if (!side) return null
  const dict = dictionaries[locale]
  const map: Record<PartSide, string> = {
    left: dict.wizard.partDetails.sideLeft,
    right: dict.wizard.partDetails.sideRight,
    both: dict.wizard.partDetails.sideBoth,
  }
  return map[side]
}

export function resolvePreferredContactLabel(locale: Locale, method: PreferredContact): string {
  const dict = dictionaries[locale]
  const map: Record<PreferredContact, string> = {
    whatsapp: dict.contact.whatsapp.label,
    phone: dict.contact.phone.label,
    email: dict.contact.email.label,
  }
  return map[method]
}
