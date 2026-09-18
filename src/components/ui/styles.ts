// Shared class-string tokens for the visual design system — pure string
// builders (not components) so they drop into any element (<button>,
// <Link>, <a>, <div>) without changing element types, props, or handlers
// anywhere they're used. Centralizing these is what keeps radius/shadow/
// spacing/height consistent across the whole app; edit here, not per file.

export type ButtonVariant = 'primary' | 'gold' | 'secondary' | 'secondary-muted' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent font-semibold text-accent-foreground shadow-sm hover:-translate-y-px hover:bg-accent-hover hover:shadow-glow active:translate-y-0 active:scale-[0.98] active:bg-accent',
  // Restrained warm variant — premium emphasis only (source-a-vehicle nudge,
  // success moments), never a drop-in replacement for `primary`.
  gold: 'bg-accent-gold font-semibold text-accent-gold-foreground shadow-sm hover:-translate-y-px hover:opacity-90 hover:shadow-glow-gold active:translate-y-0 active:scale-[0.98] active:opacity-100',
  secondary: 'border border-border bg-transparent font-medium text-foreground hover:border-accent-hover hover:text-accent-hover hover:bg-accent-soft/50',
  'secondary-muted':
    'border border-border bg-transparent font-medium text-muted-foreground hover:border-accent-hover hover:text-accent-hover hover:bg-accent-soft/50',
  ghost: 'font-medium text-accent hover:text-accent-hover hover:underline underline-offset-4',
  // Destructive actions only (permanent delete) — the one place red replaces
  // the accent color outright rather than tinting on top of it.
  danger:
    'bg-red-600 font-semibold text-white shadow-sm hover:-translate-y-px hover:bg-red-700 active:translate-y-0 active:scale-[0.98] active:bg-red-600',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  pill = false,
  className = '',
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  // Mutually exclusive with the default radius — kept as a dedicated flag
  // rather than passed via className, since two conflicting radius
  // utilities of equal CSS specificity have cascade order that depends on
  // Tailwind's internal generation order, not on className string order.
  pill?: boolean
  className?: string
} = {}): string {
  return [BUTTON_BASE, pill ? 'rounded-full' : 'rounded-xl', BUTTON_SIZES[size], BUTTON_VARIANTS[variant], fullWidth ? 'w-full' : '', className]
    .filter(Boolean)
    .join(' ')
}

// Square, icon-only buttons (close, hamburger, theme toggle) — always a
// real 40-44px hit area with the icon perfectly centered.
export function iconButtonClasses({
  size = 'md',
  variant = 'secondary',
  className = '',
}: {
  size?: 'sm' | 'md'
  // 'overlay' is for a button sitting directly on a photo/dark scrim (the
  // photo-gallery lightbox close button) — a dedicated variant rather than
  // a className override, for the same reason `pill`/`tone` exist above:
  // two conflicting border-color/text-color utilities on one element don't
  // reliably resolve by className string order.
  variant?: 'secondary' | 'ghost' | 'overlay'
  className?: string
} = {}): string {
  const dimension = size === 'sm' ? 'h-10 w-10' : 'h-11 w-11'
  const looks: Record<typeof variant, string> = {
    secondary: 'border border-border text-foreground hover:border-accent-hover hover:text-accent-hover',
    ghost: 'text-muted-foreground hover:bg-surface hover:text-foreground',
    overlay: 'border border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20',
  }
  return [
    'inline-flex shrink-0 items-center justify-center rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    dimension,
    looks[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

// Small toggle/tag buttons (condition, side, contact-method pickers).
export function pillClasses(active: boolean, className = ''): string {
  return [
    'inline-flex h-10 items-center justify-center rounded-xl border px-4 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    active ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted-foreground hover:border-accent-hover hover:text-accent-hover',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

// Elevated card surface — real white (light) / lifted navy (dark) with the
// theme-aware --shadow-card token, never a hardcoded shadow-md/lg per file.
export function cardClasses({
  padding = 'md',
  hoverable = false,
  // 'accent' swaps border/background together for a visually-stronger card
  // (e.g. the admin status-update panel) — a dedicated option rather than
  // a className override, since two conflicting border-color/background-
  // color utilities of equal specificity don't reliably resolve by
  // className string order (see the same note on buttonClasses' `pill`).
  // 'raised' is the public-site "premium panel" look (hero/CTA wrappers) —
  // a fourth depth level in dark mode, a faint tinted gradient in light.
  tone = 'default',
  className = '',
}: {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  tone?: 'default' | 'accent' | 'raised'
  className?: string
} = {}): string {
  const paddings: Record<typeof padding, string> = {
    none: '',
    sm: 'p-5',
    md: 'p-6 sm:p-8',
    lg: 'p-8 sm:p-12',
  }
  const tones: Record<typeof tone, string> = {
    default: 'border-border bg-card',
    accent: 'border-accent/25 bg-accent-soft/40',
    raised: 'border-border bg-surface-raised bg-gradient-to-br from-accent-soft/60 via-surface-raised to-surface-raised dark:from-accent-soft/30',
  }
  return [
    'rounded-2xl border shadow-card transition duration-200',
    tones[tone],
    paddings[padding],
    hoverable ? 'hover:-translate-y-1 hover:border-accent-hover/40 hover:shadow-card-hover' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

// Text inputs, selects and textareas — one shared look everywhere. Sits on
// --surface-raised, not --surface: these fields live inside a --card panel
// (see cardClasses' default tone), and --surface is *darker* than --card —
// stacking a darker field inside a lighter card made every input read as a
// sunken hole instead of an elevated surface. --surface-raised is a hair
// lighter than --card in dark mode (identical to --card in light mode,
// which has no extra depth level), so the field now sits visibly *above*
// its panel instead of below it.
export const inputClass =
  'w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground shadow-sm transition duration-200 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50'

// Layered icon-circle wrapper — the one reusable primitive for "feature
// icon in a glowing circle" (brief: icon circle, subtle glow, consistent
// stroke) instead of hand-rolling `h-11 w-11 rounded-xl bg-accent-soft` per
// file. `md` = feature strips (48px circle / pair with a 24px icon), `lg` =
// hero/success moments (64px circle / pair with a 32px icon), `xl` = a
// singular hero-scale benefit/CTA icon (80px circle / pair with a 36px
// icon) that needs to breathe rather than sit in a tight cap.
export function iconCircleClasses({
  size = 'md',
  tone = 'blue',
  className = '',
}: {
  size?: 'md' | 'lg' | 'xl'
  tone?: 'blue' | 'gold'
  className?: string
} = {}): string {
  const sizes: Record<typeof size, string> = {
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
  }
  const tones: Record<typeof tone, string> = {
    blue: 'bg-accent-soft text-accent shadow-glow',
    gold: 'bg-accent-gold-soft text-accent-gold shadow-glow-gold',
  }
  return ['inline-flex shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/10', sizes[size], tones[tone], className]
    .filter(Boolean)
    .join(' ')
}
