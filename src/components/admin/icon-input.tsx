import type { InputHTMLAttributes, ReactNode, ComponentType } from 'react'
import { inputClass } from '@/src/components/ui/styles'

// Text input with a leading icon (and an optional trailing slot, e.g. the
// password show/hide toggle in password-input.tsx) — used by the login
// screen and the settings account forms so both share one visual language
// instead of two hand-rolled input styles.
export function IconInput({
  icon: Icon,
  rightSlot,
  className = '',
  ...props
}: {
  icon: ComponentType<{ className?: string }>
  rightSlot?: ReactNode
  className?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
      <input {...props} className={`${inputClass} pl-10 ${rightSlot ? 'pr-10' : ''} ${className}`} />
      {rightSlot && <div className="absolute top-1/2 right-2 -translate-y-1/2">{rightSlot}</div>}
    </div>
  )
}
