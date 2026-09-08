export function HeroVisual() {
  return (
    // Placeholder composition — swap the vehicle artwork below for a
    // production photo/render inside this same layered container when ready.
    <div className="relative mx-auto w-full max-w-xl">
      {/* Secondary panel peeking out behind the main card for layered depth */}
      <div className="absolute -right-4 -bottom-4 h-full w-full rounded-3xl border border-border bg-surface/60" />

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-background to-surface shadow-2xl shadow-black/10 dark:shadow-black/40">
        {/* Soft showroom spotlight from above */}
        <div className="absolute top-0 left-1/2 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />

        {/* Ambient corner glows */}
        <div className="absolute -top-10 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -right-10 -bottom-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

        {/* Soft diagonal light beams, like a garage skylight */}
        <div className="absolute -top-1/4 left-1/5 h-[140%] w-20 rotate-12 bg-gradient-to-b from-accent/10 via-accent/5 to-transparent blur-2xl" />
        <div className="absolute -top-1/4 right-1/4 h-[140%] w-14 -rotate-6 bg-gradient-to-b from-accent/10 via-transparent to-transparent blur-2xl" />

        {/* Faint blueprint grid, fading toward the top like a garage ceiling */}
        <div
          className="absolute inset-0 opacity-[0.1] [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_85%,transparent)]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Showroom floor */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-border/50 to-transparent" />
        <div className="absolute inset-x-6 bottom-[27%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute inset-x-10 bottom-[14%] h-px bg-[repeating-linear-gradient(to_right,var(--color-border)_0,var(--color-border)_10px,transparent_10px,transparent_22px)] opacity-60" />

        {/* Inner highlight ring for a premium "glass case" edge */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]" />
        {/* Subtle vignette for depth */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_70px_rgba(0,0,0,0.18)]" />

        <svg
          viewBox="0 0 480 260"
          className="absolute inset-x-0 bottom-6 mx-auto h-auto w-[94%]"
          aria-hidden="true"
        >
          <defs>
            <filter id="heroVisualSoftBlur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter id="heroVisualLightGlow" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>

            <radialGradient id="heroFloorGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="heroBodyPaint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity="0.55" />
              <stop offset="45%" stopColor="var(--color-foreground)" stopOpacity="0.92" />
              <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity="0.78" />
            </linearGradient>

            <linearGradient id="heroGlassPaint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.14" />
            </linearGradient>

            <linearGradient id="heroSheen" x1="0" y1="0" x2="1" y2="0.7">
              <stop offset="30%" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="46%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="58%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="heroBottomShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="55%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.28" />
            </linearGradient>

            <radialGradient id="heroRimPaint" cx="38%" cy="32%" r="70%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.35" />
            </radialGradient>

            <radialGradient id="heroTirePaint" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity="0.45" />
              <stop offset="55%" stopColor="var(--color-foreground)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity="0.95" />
            </radialGradient>

            <linearGradient id="heroFadeMask" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <mask id="heroReflectionMask">
              <rect x="0" y="0" width="480" height="260" fill="url(#heroFadeMask)" />
            </mask>

            <path
              id="heroCarBody"
              d="M60,168 C60,150 72,140 90,138 L108,138 C118,105 155,84 200,82 L300,82 C338,84 362,100 378,124 L392,136 C408,138 420,148 424,162 L426,170 C426,175 421,178 415,178 L68,178 C63,178 60,174 60,168 Z"
            />
            <clipPath id="heroCarClip">
              <use href="#heroCarBody" />
            </clipPath>

            <g id="hero-vehicle-silhouette">
              {/* Body */}
              <use href="#heroCarBody" fill="url(#heroBodyPaint)" />

              {/* Rocker-panel ambient occlusion + diagonal sheen, clipped to the body */}
              <rect x="0" y="60" width="480" height="140" fill="url(#heroBottomShade)" clipPath="url(#heroCarClip)" />
              <rect x="0" y="60" width="480" height="140" fill="url(#heroSheen)" clipPath="url(#heroCarClip)" />

              {/* Glass */}
              <path
                d="M118,132 C128,108 158,94 200,92 L292,92 C320,94 340,106 352,124 L340,132 Z"
                fill="url(#heroGlassPaint)"
              />

              {/* Character line along the doors */}
              <path
                d="M95,148 C160,144 260,144 340,148 C365,150 388,153 405,158"
                fill="none"
                stroke="var(--color-background)"
                strokeOpacity="0.3"
                strokeWidth="1.5"
              />

              {/* Door seams */}
              <path d="M198,140 C196,155 196,166 199,177" fill="none" stroke="var(--color-background)" strokeOpacity="0.25" strokeWidth="1.25" />
              <path d="M302,140 C304,155 304,166 301,177" fill="none" stroke="var(--color-background)" strokeOpacity="0.25" strokeWidth="1.25" />

              {/* Side mirror */}
              <path
                d="M112,126 C107,123 101,125 101,130 C101,135 107,138 113,134 Z"
                fill="var(--color-foreground)"
                opacity="0.75"
              />

              {/* Rim light along the roof, hood and rear fender */}
              <path
                d="M108,138 C118,105 155,84 200,82 L300,82 C338,84 362,100 378,124"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-accent/80"
              />
              <path
                d="M60,168 C60,150 72,140 90,138"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-accent/50"
              />
              <path
                d="M392,136 C408,138 420,148 424,162"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-accent/50"
              />

              {/* Specular highlight on the windshield */}
              <path d="M148,112 L226,96" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />

              {/* Headlight (front) */}
              <ellipse cx="410" cy="158" rx="16" ry="11" fill="currentColor" className="text-accent/50" filter="url(#heroVisualLightGlow)" />
              <ellipse cx="410" cy="158" rx="5" ry="3.5" fill="#ffffff" opacity="0.95" />

              {/* Taillight (rear) */}
              <ellipse cx="70" cy="158" rx="12" ry="8" fill="currentColor" className="text-accent/50" filter="url(#heroVisualLightGlow)" />
              <ellipse cx="70" cy="158" rx="4" ry="3" fill="currentColor" className="text-accent" opacity="0.9" />

              {/* Wheel arch contact shadows */}
              {[140, 360].map((cx) => (
                <ellipse key={`arch-${cx}`} cx={cx} cy="174" rx="33" ry="9" fill="#000000" opacity="0.16" filter="url(#heroVisualSoftBlur)" />
              ))}

              {/* Wheels */}
              {[140, 360].map((cx) => (
                <g key={cx}>
                  <circle cx={cx} cy="182" r="29" fill="url(#heroTirePaint)" />
                  <circle cx={cx} cy="182" r="29" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="1" />
                  <circle cx={cx} cy="182" r="15" fill="url(#heroRimPaint)" />
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <line
                      key={deg}
                      x1={cx}
                      y1="171"
                      x2={cx}
                      y2="177"
                      stroke="var(--color-background)"
                      strokeOpacity="0.55"
                      strokeWidth="1.5"
                      transform={`rotate(${deg} ${cx} 182)`}
                    />
                  ))}
                  <circle cx={cx} cy="182" r="3" fill="var(--color-background)" opacity="0.7" />
                </g>
              ))}
            </g>
          </defs>

          {/* Contact shadow / spotlight on the floor */}
          <ellipse cx="240" cy="214" rx="175" ry="16" fill="url(#heroFloorGlow)" />

          {/* Floor reflection */}
          <g transform="translate(0,420) scale(1,-1)" opacity="0.22" mask="url(#heroReflectionMask)">
            <use href="#hero-vehicle-silhouette" />
          </g>

          <use href="#hero-vehicle-silhouette" />
        </svg>
      </div>
    </div>
  )
}
