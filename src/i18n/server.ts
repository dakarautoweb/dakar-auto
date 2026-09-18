import 'server-only'
import { cookies } from 'next/headers'
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  themeCookieName,
  type Locale,
  type Theme,
} from './config'

export async function getCurrentLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(localeCookieName)?.value
  return value && isLocale(value) ? value : defaultLocale
}

export async function getCurrentTheme(): Promise<Theme> {
  const store = await cookies()
  // Premium automotive showroom brand: dark is the default first-visit
  // experience; a visitor only sees light after explicitly toggling it
  // (cookie set by src/components/theme-toggle.tsx).
  return store.get(themeCookieName)?.value === 'light' ? 'light' : 'dark'
}
