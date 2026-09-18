'use client'

import { useEffect, useState } from 'react'

// This SVG shares one coordinate system with the real <img> it sits on top
// of (see source-vehicle.tsx): the wrapper around both is sized from the
// image's own natural aspect ratio (real <img>, width 100%/height auto, no
// `background-size` anywhere), so the wrapper's box is always exactly the
// image's aspect ratio, never cropped or letterboxed. This SVG's `viewBox`
// is that same photo's real pixel dimensions, with `preserveAspectRatio=
// "xMidYMid meet"` — since the box it's stretched into already has that
// exact aspect ratio, "meet" lands as a perfect 1:1 fit. That's what makes
// a coordinate here the same pixel on the photo at every viewport: no
// independent scaling, no slice-crop, no stretch distortion.
//
// Coordinates were hand-measured directly against vehicle-search-dark.png —
// cropped/upscaled the map region with sharp, read pixel positions off the
// actual continents, then verified by compositing these exact paths back
// onto the real photo and visually confirming every endpoint lands on the
// intended landmass (Canada, N.W. Africa, Japan, Australia, S.E. Africa,
// Russia, Brazil) before finalizing. Australia -> Africa's control points
// bow upward (not down toward the SUV) — the previous version dipped low
// and read as a "bottom arc" hugging the car.
type Endpoint = { x: number; y: number }
type Route = { d: string; begin: number; start: Endpoint; end: Endpoint }

const ROUTES: Route[] = [
  // Canada -> Senegal: nudged +35/+20 from its original (1055,60)-(1300,210)
  // position — was sitting too far left/high; end point now lands more
  // clearly on the West Africa/Senegal coastal bulge. This route's own
  // Canada point is intentionally independent of route[1]'s Canada
  // endpoint below (unchanged, per instruction to touch only this route).
  { d: 'M 1090 80 C 1175 30, 1295 80, 1335 230', begin: 0, start: { x: 1090, y: 80 }, end: { x: 1335, y: 230 } },
  { d: 'M 1663 150 C 1480 25, 1230 15, 1055 60', begin: 4, start: { x: 1663, y: 150 }, end: { x: 1055, y: 60 } }, // Japan -> Canada
  { d: 'M 1650 300 C 1550 230, 1440 220, 1345 280', begin: 8, start: { x: 1650, y: 300 }, end: { x: 1345, y: 280 } }, // Australia -> Africa
  { d: 'M 1480 55 C 1350 40, 1220 120, 1160 285', begin: 12, start: { x: 1480, y: 55 }, end: { x: 1160, y: 285 } }, // Russia -> Brazil
]

// Keeps every route/node/glow clear of the SUV (roofline starts ~y=333 in
// this photo) and off the left text column (map starts ~x=750).
const CLIP = { x: 750, y: 0, width: 1166, height: 330 }

// Small group-level nudge — right and down — applied to the whole overlay
// as a single transform rather than by re-tuning each route's own
// coordinates: keeps every arc/node/dot moving together as one group, off
// the very top edge, and better centered over the map/car area. Routes,
// curves, and animation timing below are unchanged.
const GROUP_OFFSET = { dx: 40, dy: 8 }

const DUR = 20 // seconds per route cycle; staggered begins (0/4/8/12s) keep one loop feeling continuous.

// Responsive density: base (mobile) draws only the first route with no
// travelling dot; `sm` adds a second (with its dot); `md` a third; `lg`+
// shows all four — per "desktop: all 4, tablet: reduced, mobile: simplify".
const ROUTE_VISIBILITY = ['block', 'hidden sm:block', 'hidden md:block', 'hidden lg:block']
const DOT_VISIBILITY = ['hidden sm:block', 'hidden sm:block', 'hidden sm:block', 'hidden sm:block']

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// One instance per theme (see source-vehicle.tsx), layered directly on top
// of that theme's real <img> inside the same aspect-locked wrapper. `uid`
// only namespaces filter/mask ids so the two simultaneously-mounted
// instances (dark + light, cross-faded by opacity) never collide.
// `viewBoxWidth`/`viewBoxHeight` must be that specific photo's real pixel
// dimensions (dark.png is 1916×821, light.png is 1915×821).
export function GlobalRouteOverlay({ uid, viewBoxWidth, viewBoxHeight }: { uid: string; viewBoxWidth: number; viewBoxHeight: number }) {
  const reducedMotion = useReducedMotion()
  const clipId = `routeClip-${uid}`

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <filter id={`routeGlow-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`dotGlow-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.0" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`nodeGlow-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id={clipId}>
          <rect x={CLIP.x} y={CLIP.y} width={CLIP.width} height={CLIP.height} />
        </clipPath>

        {!reducedMotion &&
          ROUTES.map((route, i) => (
            <mask key={i} id={`routeMask-${uid}-${i}`}>
              <rect x="0" y="0" width="100%" height="100%" fill="black" />
              <path d={route.d} fill="none" stroke="white" strokeWidth={7} strokeLinecap="round" strokeDasharray={1000} strokeDashoffset={1000} pathLength={1000}>
                <animate
                  attributeName="stroke-dashoffset"
                  values="1000;1000;0;0;1000"
                  keyTimes="0;0.10;0.48;0.72;1"
                  dur={`${DUR}s`}
                  begin={`${route.begin}s`}
                  repeatCount="indefinite"
                />
              </path>
            </mask>
          ))}
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <g transform={`translate(${GROUP_OFFSET.dx}, ${GROUP_OFFSET.dy})`}>
        {reducedMotion ? (
          <>
            {ROUTES.map((route, i) => (
              <path
                key={i}
                d={route.d}
                fill="none"
                stroke="rgba(206, 160, 86, 0.42)"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#routeGlow-${uid})`}
              />
            ))}
            {ROUTES.map((route, i) => (
              <g key={i}>
                <circle cx={route.start.x} cy={route.start.y} r={4} fill="rgba(228, 183, 100, 0.55)" filter={`url(#nodeGlow-${uid})`} />
                <circle cx={route.end.x} cy={route.end.y} r={4} fill="rgba(228, 183, 100, 0.55)" filter={`url(#nodeGlow-${uid})`} />
              </g>
            ))}
          </>
        ) : (
          ROUTES.map((route, i) => (
            <g key={i} className={ROUTE_VISIBILITY[i]}>
              <circle cx={route.start.x} cy={route.start.y} r={4.2} fill="rgba(228, 183, 100, 0.70)" filter={`url(#nodeGlow-${uid})`} opacity={0}>
                <animate
                  attributeName="opacity"
                  values="0;0.68;0.68;0.68;0;0"
                  keyTimes="0;0.08;0.26;0.62;0.82;1"
                  dur={`${DUR}s`}
                  begin={`${route.begin}s`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={route.end.x} cy={route.end.y} r={4.2} fill="rgba(228, 183, 100, 0.70)" filter={`url(#nodeGlow-${uid})`} opacity={0}>
                <animate
                  attributeName="opacity"
                  values="0;0;0.70;0.70;0;0"
                  keyTimes="0;0.34;0.48;0.66;0.82;1"
                  dur={`${DUR}s`}
                  begin={`${route.begin}s`}
                  repeatCount="indefinite"
                />
              </circle>

              <g opacity={0}>
                <animate
                  attributeName="opacity"
                  values="0;0;1;1;0.85;0;0"
                  keyTimes="0;0.08;0.12;0.56;0.70;0.82;1"
                  dur={`${DUR}s`}
                  begin={`${route.begin}s`}
                  repeatCount="indefinite"
                />
                <path
                  d={route.d}
                  fill="none"
                  stroke="rgba(206, 160, 86, 0.50)"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`url(#routeGlow-${uid})`}
                  mask={`url(#routeMask-${uid}-${i})`}
                />
              </g>

              <circle r={4.9} fill="rgba(255, 223, 160, 0.88)" filter={`url(#dotGlow-${uid})`} opacity={0} className={DOT_VISIBILITY[i]}>
                <animate
                  attributeName="opacity"
                  values="0;0;1;1;0;0"
                  keyTimes="0;0.10;0.14;0.48;0.62;1"
                  dur={`${DUR}s`}
                  begin={`${route.begin}s`}
                  repeatCount="indefinite"
                />
                <animateMotion
                  path={route.d}
                  dur={`${DUR}s`}
                  begin={`${route.begin}s`}
                  repeatCount="indefinite"
                  keyPoints="0;0;1;1"
                  keyTimes="0;0.14;0.48;1"
                  calcMode="linear"
                />
              </circle>
            </g>
          ))
        )}
        </g>
      </g>
    </svg>
  )
}
