import Link from 'next/link'
import type { ReactNode } from 'react'

export function PlaceholderPage({
  badge,
  title,
  description,
  backLabel,
  children,
}: {
  badge: string
  title: string
  description: string
  backLabel: string
  children?: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent-soft px-4 py-1.5 text-xs font-semibold tracking-widest text-accent">
        {badge}
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-4 text-muted-foreground">{description}</p>
      {children}
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
      >
        {backLabel}
      </Link>
    </div>
  )
}
