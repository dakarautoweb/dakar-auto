import type { ComponentType } from 'react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { TrackingStatusEvent } from '@/src/services/tracking/types'
import { statusLabel } from '@/src/components/admin/status-badge'
import { CarSideIcon, CheckCircleIcon, ClockIcon, CubeIcon, NotesIcon, PhoneIcon, SettingsGearIcon } from '@/src/components/home/icons'

// The four-step "happy path" customers move through. closed/cancelled are
// terminal states reached from any point, not steps on this line — shown
// as a distinct notice instead of trying to place them on the stepper.
// Two variants share this one component (item 5: reuse, don't duplicate) —
// the caller passes the right one via the `mainSteps` prop.
export const PARTS_MAIN_STEPS = ['request_received', 'on_treatment', 'parts_found', 'direct_communication'] as const
export const VEHICLE_MAIN_STEPS = ['request_received', 'on_treatment', 'vehicle_found', 'direct_communication'] as const

type StepState = 'done' | 'current' | 'upcoming'

// One glyph per step id — purely presentational (which icon a status shows),
// never consulted for status logic/ordering.
const STEP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  request_received: NotesIcon,
  on_treatment: SettingsGearIcon,
  parts_found: CubeIcon,
  vehicle_found: CarSideIcon,
  direct_communication: PhoneIcon,
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function StepIndicator({ step, state }: { step: string; state: StepState }) {
  const Icon = STEP_ICONS[step] ?? NotesIcon
  const size = 'h-12 w-12 sm:h-14 sm:w-14'
  const iconSize = 'h-5 w-5 sm:h-6 sm:w-6'

  if (state === 'done') {
    return (
      <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glow`}>
        <Icon className={iconSize} />
      </span>
    )
  }

  if (state === 'current') {
    // A soft ring pulses outward (motion-safe only, per prefers-reduced-motion)
    // around the step's own icon — the "active step" indicator.
    return (
      <span className={`relative flex ${size} shrink-0 items-center justify-center`}>
        <span className="absolute inset-0 rounded-full bg-accent/20 motion-safe:animate-ping" aria-hidden="true" />
        <span className={`relative flex h-full w-full items-center justify-center rounded-full border-2 border-accent bg-accent-soft text-accent shadow-glow`}>
          <Icon className={iconSize} />
        </span>
      </span>
    )
  }

  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground`}>
      <Icon className={iconSize} />
    </span>
  )
}

function Step({
  step,
  label,
  state,
  connectorBeforeState,
  connectorAfterState,
  isLast,
}: {
  step: string
  label: string
  state: StepState
  // The line between two icons is drawn as two absolutely positioned
  // segments — one in each neighboring column — that each stop 1.75rem
  // (the sm+ icon's own radius: h-14/w-14 = 3.5rem, so half of that) short
  // of the shared column edge where the icon sits centered. That gap is
  // exactly the width of the icon circle, so the line only ever occupies
  // the space BETWEEN two circles and never reaches under one — no need to
  // stack the icon above it, because the line's geometry never gets there.
  // Both segments of one gap always resolve to the same color because
  // they're colored from the same source step's state (see the two
  // stepState(...) calls at the call site), so the seam at the midpoint
  // between icons is invisible regardless of how wide each column ends up.
  // null means "no line on this side" (the first/last step has no outer edge).
  connectorBeforeState: StepState | null
  connectorAfterState: StepState | null
  isLast: boolean
}) {
  return (
    <li className="relative flex sm:flex-1 sm:flex-col sm:items-center sm:text-center">
      {connectorBeforeState !== null && (
        <span
          aria-hidden="true"
          className={`absolute left-0 hidden h-0.5 sm:top-7 sm:block sm:w-[calc(50%-1.75rem)] ${connectorBeforeState === 'upcoming' ? 'bg-border' : 'bg-accent'}`}
        />
      )}
      {connectorAfterState !== null && (
        <span
          aria-hidden="true"
          className={`absolute right-0 hidden h-0.5 sm:top-7 sm:block sm:w-[calc(50%-1.75rem)] ${connectorAfterState === 'upcoming' ? 'bg-border' : 'bg-accent'}`}
        />
      )}

      {/* `sm:contents` drops this wrapper from the sm+ layout so the icon
          and label become direct children of the centered flex column
          below — that's what keeps the label centered under the icon
          instead of under a full-width row. On mobile it stays a real
          column (icon above its connector) sitting left of the label. */}
      <div className="flex flex-col items-center sm:contents">
        <StepIndicator step={step} state={state} />
        {!isLast && (
          <div
            className={`w-0.5 flex-1 rounded-full sm:hidden ${state === 'upcoming' ? 'bg-border' : 'bg-accent'}`}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="ml-4 pb-8 last:pb-0 sm:ml-0 sm:max-w-[8rem] sm:pb-0 sm:pt-3 sm:text-center">
        <p
          className={`text-sm ${
            state === 'upcoming' ? 'text-muted-foreground' : state === 'current' ? 'font-semibold text-accent' : 'font-semibold'
          }`}
        >
          {label}
        </p>
      </div>
    </li>
  )
}

export function StatusTimeline({
  dict,
  locale,
  status,
  history,
  mainSteps,
  statusMap,
}: {
  dict: Dictionary
  locale: string
  status: string
  // undefined => no history section rendered at all (vehicle requests have
  // no status-history table to draw one from — see get-vehicle-tracking-info.ts).
  history?: TrackingStatusEvent[]
  mainSteps: readonly string[]
  // Defaults to dict.admin.statuses (parts) inside statusLabel() when
  // omitted — vehicle callers pass dict.admin.vehicleStatuses.
  statusMap?: Record<string, string>
}) {
  const t = dict.tracking
  const isTerminal = status === 'closed' || status === 'cancelled'
  const currentStepIndex = mainSteps.indexOf(status)

  function stepState(index: number): StepState {
    if (currentStepIndex < 0) return 'upcoming'
    if (index < currentStepIndex) return 'done'
    if (index === currentStepIndex) return 'current'
    return 'upcoming'
  }

  return (
    <div>
      {isTerminal ? (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            status === 'cancelled'
              ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
              : 'border-border bg-surface text-muted-foreground'
          }`}
        >
          {status === 'closed' && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <CheckCircleIcon className="h-3.5 w-3.5" />
            </span>
          )}
          {status === 'cancelled' ? t.cancelledNotice : t.closedNotice}
        </div>
      ) : (
        <ol className="flex flex-col sm:flex-row">
          {mainSteps.map((step, index) => (
            <Step
              key={step}
              step={step}
              label={statusLabel(dict, step, statusMap)}
              state={stepState(index)}
              connectorBeforeState={index > 0 ? stepState(index - 1) : null}
              connectorAfterState={index < mainSteps.length - 1 ? stepState(index) : null}
              isLast={index === mainSteps.length - 1}
            />
          ))}
        </ol>
      )}

      {history !== undefined && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{dict.admin.detail.historySection}</h3>
          </div>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{dict.admin.detail.historyEmpty}</p>
          ) : (
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              {[...history].reverse().map((entry, index) => (
                <li key={index} className="relative">
                  <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-accent" />
                  <p className="text-sm font-medium">
                    {entry.oldStatus ? (
                      <>
                        {statusLabel(dict, entry.oldStatus, statusMap)} → {statusLabel(dict, entry.newStatus, statusMap)}
                      </>
                    ) : (
                      statusLabel(dict, entry.newStatus, statusMap)
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(entry.createdAt, locale)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
