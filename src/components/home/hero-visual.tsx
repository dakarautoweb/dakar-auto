export function HeroVisual() {
  return (
    // Placeholder composition — swap the <svg> below for a production
    // vehicle photo/render inside this same rounded container when ready.
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface to-background shadow-xl">
      <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-16 -right-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <svg
        viewBox="0 0 400 200"
        className="absolute inset-x-0 bottom-10 mx-auto h-auto w-4/5 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 140h25l20-45q10-15 30-15h55q15 0 25 12l20 23h140q20 0 25 20l5 5h20" />
        <path d="M20 140h370" />
        <circle cx="100" cy="150" r="22" />
        <circle cx="300" cy="150" r="22" />
      </svg>
    </div>
  )
}
