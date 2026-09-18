export function SectionHeading({
  eyebrow,
  title,
  description,
  center = false,
  size = 'default',
}: {
  eyebrow?: string
  title: string
  description?: string
  center?: boolean
  // 'display' is for page-hero-scale headings — larger, tighter leading.
  size?: 'default' | 'display'
}) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <span className={`mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase ${center ? 'justify-center' : ''}`}>
          <span className="h-px w-6 bg-accent/60" aria-hidden="true" />
          {eyebrow}
        </span>
      )}
      <h2
        className={
          size === 'display'
            ? 'text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl'
            : 'text-3xl font-bold tracking-tight sm:text-4xl'
        }
      >
        {title}
      </h2>
      {description && <p className={`mt-3 text-muted-foreground ${size === 'display' ? 'text-lg' : ''}`}>{description}</p>}
    </div>
  )
}
