// Full admin-facing shape of the public.site_settings singleton row —
// every field, including whichever are currently toggled hidden (the admin
// editing this needs to see/edit them regardless).
export type SiteSettings = {
  contactEmail: string
  showContactEmail: boolean
  phone: string
  showPhone: boolean
  whatsapp: string
  showWhatsapp: boolean
  instagramUrl: string
  showInstagram: boolean
  facebookUrl: string
  showFacebook: boolean
  address: string
  showAddress: boolean
  updatedAt: string | null
}

// Public-facing shape — only ever contains fields whose show_* flag is
// true (public.get_public_site_settings() enforces this in the database
// itself; a hidden field is null here, never just "not rendered").
export type PublicSiteSettings = {
  email: string | null
  phone: string | null
  whatsapp: string | null
  instagramUrl: string | null
  facebookUrl: string | null
  address: string | null
}

export const EMPTY_SITE_SETTINGS: SiteSettings = {
  contactEmail: '',
  showContactEmail: false,
  phone: '',
  showPhone: false,
  whatsapp: '',
  showWhatsapp: false,
  instagramUrl: '',
  showInstagram: false,
  facebookUrl: '',
  showFacebook: false,
  address: '',
  showAddress: false,
  updatedAt: null,
}

export const EMPTY_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  email: null,
  phone: null,
  whatsapp: null,
  instagramUrl: null,
  facebookUrl: null,
  address: null,
}
