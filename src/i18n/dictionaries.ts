import 'server-only'
import type { Locale } from './config'

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((mod) => mod.default),
  fr: () => import('./dictionaries/fr.json').then((mod) => mod.default),
}

export async function getDictionary(locale: Locale) {
  return dictionaries[locale]()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
