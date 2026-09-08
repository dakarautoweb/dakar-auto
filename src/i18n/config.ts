export const locales = ['en', 'fr'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'fr'
export const localeCookieName = 'NEXT_LOCALE'

export type Theme = 'light' | 'dark'
export const themeCookieName = 'theme'

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}
