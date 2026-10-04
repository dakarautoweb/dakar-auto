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

export type StepState = 'done' | 'current' | 'upcoming'

export function isTerminalTrackingStatus(status: string): boolean {
  return status === 'closed' || status === 'cancelled'
}

export function getTimelineStepStates(status: string, mainSteps: readonly string[]): StepState[] {
  const currentStepIndex = mainSteps.indexOf(status)
  return mainSteps.map((_, index) => {
    if (currentStepIndex < 0) return 'upcoming'
    if (index < currentStepIndex) return 'done'
    if (index === currentStepIndex) return 'current'
    return 'upcoming'
  })
}

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
      <span data-step-indicator className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-glow`}>
        <Icon className={iconSize} />
      </span>
    )
  }

  if (state === 'current') {
    // A soft ring pulses outward (motion-safe only, per prefers-reduced-motion)
    // around the step's own icon — the "active step" indicator.
    return (
      <span data-step-indicator className={`relative flex ${size} shrink-0 items-center justify-center`}>
        <span className="absolute inset-0 rounded-full bg-accent/20 motion-safe:animate-ping" aria-hidden="true" />
        <span className={`relative flex h-full w-full items-center justify-center rounded-full border-2 border-accent bg-accent-soft text-accent shadow-glow`}>
          <Icon className={iconSize} />
        </span>
      </span>
    )
  }

  return (
    <span data-step-indicator className={`flex ${size} shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground`}>
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
    <li data-status-step={step} className="relative grid h-[4.75rem] grid-cols-[3rem_minmax(0,1fr)] gap-x-4 last:h-12 sm:h-auto sm:grid-cols-1 sm:grid-rows-[3.5rem_minmax(2.75rem,auto)] sm:justify-items-center sm:gap-x-0 sm:last:h-auto sm:text-center">
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

      {/* Mobile uses one fixed 48px icon column; desktop promotes every
          item into the same two-row grid so labels cannot move the icons. */}
      {!isLast && (
        <span
          className={`absolute top-12 bottom-0 left-[calc(1.5rem-1px)] w-0.5 rounded-full sm:hidden ${state === 'upcoming' ? 'bg-border' : 'bg-accent'}`}
          aria-hidden="true"
        />
      )}

      <StepIndicator step={step} state={state} />

      <div className="col-start-2 row-start-1 flex min-w-0 items-center sm:col-start-1 sm:row-start-2 sm:max-w-[9rem] sm:items-start sm:justify-center sm:pt-3">
        <p
          className={`min-w-0 text-sm leading-5 ${
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
  // undefined => no history section rendered. Both tracking request types
  // now pass their persisted history; this remains optional for stepper-only use.
  history?: TrackingStatusEvent[]
  mainSteps: readonly string[]
  // Defaults to dict.admin.statuses (parts) inside statusLabel() when
  // omitted — vehicle callers pass dict.admin.vehicleStatuses.
  statusMap?: Record<string, string>
}) {
  const t = dict.tracking
  const isTerminal = isTerminalTrackingStatus(status)
  const stepStates = getTimelineStepStates(status, mainSteps)

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
        <ol className="grid grid-cols-1 sm:grid-cols-4 sm:px-3">
          {mainSteps.map((step, index) => (
            <Step
              key={step}
              step={step}
              label={statusLabel(dict, step, statusMap)}
              state={stepStates[index]}
              connectorBeforeState={index > 0 ? stepStates[index - 1] : null}
              connectorAfterState={index < mainSteps.length - 1 ? stepStates[index] : null}
              isLast={index === mainSteps.length - 1}
            />
          ))}
        </ol>
      )}

      {history !== undefined && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="ml-16 flex items-center gap-2 sm:ml-0">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{dict.admin.detail.historySection}</h3>
          </div>
          {history.length === 0 ? (
            <p className="mt-3 ml-16 text-sm text-muted-foreground sm:ml-0">{dict.admin.detail.historyEmpty}</p>
          ) : (
            <ol className="mt-4 ml-16 space-y-4 border-l border-border pl-4 sm:ml-0">
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
