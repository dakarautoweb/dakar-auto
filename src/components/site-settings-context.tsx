'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { PublicSiteSettings } from '@/src/services/site-settings/types'
import { EMPTY_PUBLIC_SITE_SETTINGS } from '@/src/services/site-settings/types'

const SiteSettingsContext = createContext<PublicSiteSettings>(EMPTY_PUBLIC_SITE_SETTINGS)

// Fed once from a server-fetched value in app/(site)/layout.tsx (see
// getPublicSiteSettings()), so every client component in the tree —
// including ones nested deep inside a client-only flow like the part-
// request wizard's success step — can read the same admin-configured
// contact info without each needing its own server round trip or a prop
// threaded through every intermediate component.
export function SiteSettingsProvider({ settings, children }: { settings: PublicSiteSettings; children: ReactNode }) {
  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings(): PublicSiteSettings {
  return useContext(SiteSettingsContext)
}
