import Image from 'next/image'
import type { CSSProperties } from 'react'
import earth from '@/public/tracking/track-earth.webp'

// Decorative hero visual for /track: a static photo of the Earth at night
// (public/tracking/track-earth.webp, 1774×887 — the planet fills the right
// ~60% of the frame with an orange rim glow; the left part is plain starry
// space) with a thin dashed flight path and a small paper airplane drawn on
// top in an SVG that shares the photo's own coordinate space (viewBox =
// native pixel size), so the route stays locked to the same spot on the
// planet at every rendered size.
//
// The photo never moves — the airplane (SMIL animateMotion along the route)
// is the only animated element, and under prefers-reduced-motion it is
// swapped for a static copy parked on the route. Purely decorative:
// aria-hidden.
//
// Two variants:
// - "full" (lg+): fills its absolutely positioned box and draws the photo
//   at a fixed height per breakpoint, horizontally anchored to the page's
//   centered content column so the planet's lower-left limb always starts
//   just past the form (see STAGE_LEFT), with the rest of the planet running
//   off the right edge of the viewport. The photo is masked on the
//   left/top/bottom so the starry space melts into the page background; the
//   route overlay sits outside that horizontal mask (it fades in on its own)
//   so it can start left of the planet.
// - "compact" (below lg): an in-flow, edge-to-edge 8:5 stage. The photo is
//   drawn at ~161% of the stage width and anchored right, so the stage shows
//   roughly the photo's right 62% (Europe/Africa and the rim glow; the empty
//   starry space is cropped off) and a 9%–87% band of its height. It is not
//   faded on the right, so on phones the planet reads as continuing past the
//   screen edge; the bottom fades out fully so the page heading can overlap
//   it (see app/(site)/track/page.tsx).

const W = earth.width
const H = earth.height

// Where the planet's limb crosses the lower part of the frame, as a
// fraction of the photo's height — used to keep that limb clear of the form.
const LIMB_X_PER_HEIGHT = 700 / H

// Page layout this is anchored to (app/(site)/track/page.tsx): content
// container max-w-5xl (64rem) centered with lg:px-8 (2rem), form column
// 28rem, plus a small gap before the planet begins.
const STAGE_LEFT = `calc(max(0px, (100% - 64rem) / 2) + 2rem + 28rem + 2.5rem - var(--stage-h) * ${LIMB_X_PER_HEIGHT.toFixed(3)})`

// Dakar on the West African coast, in photo pixels.
const DAKAR: [number, number] = [1203, 583]
// One smooth arch: it starts in the empty space left of the planet (just
// right of the form column), rises over the planet's rim and comes down onto
// Dakar. The first ROUTE_FADE px fade in so the line reads as coming in from
// the left side of the hero rather than being born on the planet.
const ROUTE_START: [number, number] = [670, 622]
const ROUTE = `M${ROUTE_START[0]} ${ROUTE_START[1]}C744 324 1021 175 ${DAKAR[0] - 6} ${DAKAR[1] - 12}`
const ROUTE_FADE = 200
// Small waypoint on the rising part of the arch (t≈0.3).
const WAYPOINT: [number, number] = [783, 405]
// Static airplane position/heading under reduced motion: at the top of the
// arch (t≈0.55), still over dark space just before the rim, heading right.
const STATIC_PLANE = { x: 926, y: 332, angle: -4 }

// Left fade of the starry space. On the dark theme it can reach under the
// text (stars on near-black read as background); on the light theme a dark
// photo would muddy the subtitle, so the fade starts later — right of the
// content column — and stays tight around the planet's limb. The last ~22%
// on the right also fades out, so on wide viewports (where the photo ends
// before the screen edge) there is no hard vertical cut. A mask (not an
// overlay) melts into whatever the theme's page background is.
const FULL_MASK =
  '[mask-image:linear-gradient(to_right,transparent_40%,black_54%,black_78%,transparent)] dark:[mask-image:linear-gradient(to_right,transparent_22%,black_44%,black_78%,transparent)]'
// Vertical fade lives on the section-sized box (the photo is usually taller
// than the section and gets clipped), so the planet melts away before the
// header and footer instead of being cut off.
const SECTION_MASK = '[mask-image:linear-gradient(to_bottom,transparent,black_12%,black_78%,transparent)]'
// Same split for the compact stage: horizontal fade on the photo (only the
// starry left side on phones, where the stage is full-bleed; both sides from
// sm, where it no longer reaches the screen edges), vertical fade on the
// stage box that crops it. The bottom fade reaches full transparency well
// before the edge so the overlapping heading sits on plain page background
// (dark or light theme alike), never on the bright city lights.
const COMPACT_MASK =
  '[mask-image:linear-gradient(to_right,transparent_30%,black_48%)] sm:[mask-image:linear-gradient(to_right,transparent_30%,black_48%,black_84%,transparent)]'
const STAGE_MASK = '[mask-image:linear-gradient(to_bottom,transparent,black_14%,black_52%,transparent_88%)]'

function PaperPlane() {
  return (
    <g className="drop-shadow-[0_0_6px_rgba(249,115,22,0.55)]">
      <path d="M-9 -6 11 0-9 6-5.5 0Z" className="fill-accent" />
      <path d="M-5.5 0 11 0-9 6Z" className="fill-accent-hover" />
    </g>
  )
}

// `scale` compensates for the compact banner rendering the photo much
// smaller than native, so the plane and line keep a readable size there.
function Overlay({ id, scale }: { id: string; scale: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" fill="none">
      <defs>
        <linearGradient
          id={`${id}-fade`}
          gradientUnits="userSpaceOnUse"
          x1={ROUTE_START[0]}
          y1={0}
          x2={ROUTE_START[0] + ROUTE_FADE}
          y2={0}
        >
          <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0.85 }} />
        </linearGradient>
        <filter id={`${id}-glow`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={3 * scale} />
        </filter>
      </defs>

      {/* Soft glow under the dashed line */}
      <path
        d={ROUTE}
        stroke={`url(#${id}-fade)`}
        strokeWidth={4 * scale}
        strokeLinecap="round"
        opacity={0.3}
        filter={`url(#${id}-glow)`}
      />
      <path
        id={id}
        d={ROUTE}
        stroke={`url(#${id}-fade)`}
        strokeWidth={1.6 * scale}
        strokeDasharray={`${4 * scale} ${7 * scale}`}
        strokeLinecap="round"
      />

      <circle cx={WAYPOINT[0]} cy={WAYPOINT[1]} r={2.5 * scale} className="fill-accent/70" />

      {/* Destination: Dakar (static) */}
      <circle cx={DAKAR[0]} cy={DAKAR[1]} r={9 * scale} className="stroke-accent/50" strokeWidth={scale} />
      <circle cx={DAKAR[0]} cy={DAKAR[1]} r={3 * scale} className="fill-accent" />

      {/* Flies the upper part of the arch: fades in after the faint start and
          out before the descent onto Dakar. */}
      <g className="motion-reduce:hidden" opacity="0">
        <animateMotion
          dur="11s"
          repeatCount="indefinite"
          rotate="auto"
          keyPoints="0.12;0.88"
          keyTimes="0;1"
          calcMode="linear"
        >
          <mpath href={`#${id}`} />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="11s" repeatCount="indefinite" />
        <g transform={`scale(${scale})`}>
          <PaperPlane />
        </g>
      </g>
      <g
        className="hidden motion-reduce:inline"
        transform={`translate(${STATIC_PLANE.x} ${STATIC_PLANE.y}) rotate(${STATIC_PLANE.angle}) scale(${scale})`}
      >
        <PaperPlane />
      </g>
    </svg>
  )
}

export function TrackingHeroArt({
  variant = 'full',
  className = '',
}: {
  variant?: 'full' | 'compact'
  className?: string
}) {
  if (variant === 'compact') {
    return (
      <div className={`relative aspect-[8/5] overflow-hidden ${STAGE_MASK} ${className}`} aria-hidden="true">
        <div className="absolute top-[-11.6%] right-0 aspect-[1774/887] w-[161%]">
          <div className={`absolute inset-0 ${COMPACT_MASK}`}>
            <Image src={earth} alt="" fill sizes="(min-width: 1024px) 1px, (min-width: 640px) 1030px, 161vw" className="object-cover" />
          </div>
          <Overlay id="track-earth-route-compact" scale={1.6} />
        </div>
      </div>
    )
  }

  return (
    <div className={`overflow-hidden ${SECTION_MASK} ${className}`} aria-hidden="true">
      <div
        className="absolute top-1/2 aspect-[1774/887] h-(--stage-h) -translate-y-1/2 [--stage-h:48rem] xl:[--stage-h:52rem] 2xl:[--stage-h:58rem]"
        style={{ left: STAGE_LEFT } as CSSProperties}
      >
        <div className={`absolute inset-0 ${FULL_MASK}`}>
          <Image src={earth} alt="" fill preload sizes="(min-width: 1024px) 1800px, 1px" className="object-cover" />
        </div>
        <Overlay id="track-earth-route-full" scale={1} />
      </div>
    </div>
  )
}
