import { VehicleImage } from '@/src/components/vehicle-image'

// Right-hand visual for the Vehicle Wanted section on the vehicle-request
// detail page — deliberately NOT the same box as the parts-request detail
// page's vehicle preview (see app/admin/(dashboard)/requests/[id]/page.tsx,
// the `h-56 w-full ... lg:w-80` landscape panel next to VehicleField rows).
// That one previews a specific physical car Auto.dev/CarImages already
// identified; this one is a *wanted* vehicle a customer described in free
// text — there's nothing to look up. So this panel is smaller, portrait
// instead of landscape, and carries its own subtle diagonal line pattern
// (a texture, not a photo-shaped placeholder) so the two don't read as the
// same component reused, even though both ultimately lean on VehicleImage's
// shared broken-image-safe fallback logic for the "real photo" branch.
//
// vehicle_requests has no stored image URL today (unlike parts_requests'
// vehicles.image_url) — imageUrl is only ever passed here as `null` by the
// current caller, on purpose: inventing a live CarImages/Auto.dev lookup
// just to decorate a "wanted" vehicle (which was never identified by VIN or
// photo) isn't real data, so this always renders the placeholder for now.
// The `imageUrl` prop still exists so a future durable image source can
// light this up without any change to this component.
export function VehicleWantedVisual({
  imageUrl,
  placeholderLabel,
  hint,
}: {
  imageUrl?: string | null
  placeholderLabel: string
  hint?: string
}) {
  return (
    <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-border bg-surface sm:w-44 lg:w-48" style={{ aspectRatio: '3 / 4' }}>
      {/* Subtle automotive line pattern — a texture behind the icon/photo,
          not a decorative image of its own. Orange-tinted and very low
          opacity so it reads as "premium showroom backdrop," not noise;
          theme-aware via currentColor (this element's own text-accent). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-accent opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 14px)',
        }}
      />
      <VehicleImage
        src={imageUrl}
        className="relative h-full w-full object-contain p-4"
        variant="placeholder"
        placeholderLabel={placeholderLabel}
      />
      {hint && (
        <p className="absolute inset-x-0 bottom-2 text-center text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase">{hint}</p>
      )}
    </div>
  )
}
