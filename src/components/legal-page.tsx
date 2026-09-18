import type { ReactNode } from 'react'

// Shared shell for long-form legal content (Privacy Policy, Terms) — same
// eyebrow/title pattern used elsewhere on the public site (e.g. /track),
// just wrapping prose sections instead of a form or a status panel.
export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
        <span className="h-px w-6 bg-accent/60" aria-hidden="true" />
        {eyebrow}
      </span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-4 text-muted-foreground">{intro}</p>}
      <div className="mt-10 space-y-10">{children}</div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_strong]:font-medium">
        {children}
      </div>
    </section>
  )
}
