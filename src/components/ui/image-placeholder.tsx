// Explicit, clearly-marked slot for a real photograph we don't have yet
// (e.g. port/shipping imagery, a parts-catalog hero shot). Never used to
// fake a real photo — swap the whole component for a real <img>/<VehicleImage>
// once the asset exists.
export function AssetPlaceholder({
  label,
  ratio = 'aspect-[16/10]',
  className = '',
}: {
  label: string
  ratio?: string
  className?: string
}) {
  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface/60 px-6 py-10 text-center ${ratio} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-muted-foreground/60">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2" />
        <path d="M21 16l-5-5-4 4-3-3-4 4" />
      </svg>
      <p className="text-xs font-medium tracking-wide text-muted-foreground/80 uppercase">Image asset needed</p>
      <p className="max-w-xs text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
