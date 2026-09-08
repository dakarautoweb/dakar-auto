import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import '../globals.css'
import { getCurrentLocale, getCurrentTheme } from '@/src/i18n/server'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Dakar Auto — Admin',
  robots: { index: false, follow: false },
}

// A separate root layout for the whole /admin/* tree (a route group, so this
// is a "multiple root layouts" setup — see Next.js route-groups docs). Kept
// deliberately minimal: no public marketing header/footer here. The
// dashboard chrome (sidebar, nav) lives one level down, in
// app/admin/(dashboard)/layout.tsx, so /admin/login can render without it.
export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const locale = await getCurrentLocale()
  const theme = await getCurrentTheme()

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme === 'dark' ? 'dark' : ''}`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  )
}
