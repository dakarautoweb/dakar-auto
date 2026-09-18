import type { ComponentType, ReactNode } from 'react'

// Shared "icon + label" row for the vehicle-request form fields (vehicle-step
// / budget-step) — consistent icon language per field instead of plain text
// labels, matching the request's icon-per-field reference layout.
export function FieldLabel({
  icon: Icon,
  htmlFor,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  htmlFor: string
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
      <Icon className="h-6 w-6 shrink-0 text-accent" />
      {children}
    </label>
  )
}
