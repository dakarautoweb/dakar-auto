import { VehicleImage } from '@/src/components/vehicle-image'

export function HeroVisual({ imageUrl, caption }: { imageUrl?: string | null; caption?: string }) {
  return (
    // Deliberately allowed to run wider than its grid column on large
    // screens (w-[112%] + negative margin) and bleed into the section's
    // own overflow-hidden edge — this is what makes the composite "dominate
    // the right half" instead of reading as a small sticker centered in
    // dead space. object-bottom keeps it visually grounded on the road in
    // hero-background.webp rather than floating mid-frame.
    <div className="relative mx-auto w-full max-w-xl select-none sm:max-w-2xl lg:ml-auto lg:max-w-none xl:w-[122%] xl:-mr-[10%] 2xl:w-[130%] 2xl:-mr-[14%]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/5 left-1/2 h-3/4 w-3/4 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -right-8 bottom-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      </div>

      {caption && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-4 z-10 max-w-[10rem] -rotate-3 text-right font-serif text-base text-accent/90 italic sm:right-8 sm:max-w-none sm:text-lg lg:right-14 lg:text-xl"
        >
          {caption}
        </span>
      )}

      {/* Box kept at the same size regardless of imageUrl so the section's
          height (and its hero-background.webp crop) doesn't shift. In the
          idle state (imageUrl null) it renders empty — the warehouse photo
          just shows through on its own, no vehicle composite layered on
          top. Once a VIN decodes to a real photo, imageUrl fills this in
          along with its own grounding shadow/light. */}
      <div className="relative aspect-[5/4] w-full sm:aspect-[4/3]">
        {imageUrl && (
          <>
            {/* Warm reflected road light — a low, wide amber glow under the
                vehicle, as if bouncing off wet asphalt in hero-background.webp. */}
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-accent/25 via-accent/5 to-transparent blur-md" />
            {/* Contact shadow, grounding the photo instead of letting it float. */}
            <div className="absolute inset-x-[12%] bottom-[2%] h-5 rounded-[50%] bg-black/45 blur-xl dark:bg-black/65" />

            <VehicleImage
              src={imageUrl}
              alt=""
              showReflection
              className="relative h-full w-full object-contain object-bottom drop-shadow-2xl"
              fallbackClassName="relative h-full w-full object-contain object-bottom drop-shadow-2xl"
            />
          </>
        )}
      </div>
    </div>
  )
}
