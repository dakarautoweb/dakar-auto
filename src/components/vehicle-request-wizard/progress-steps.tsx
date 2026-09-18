import { CheckIcon } from '@/src/components/home/icons'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { WizardStep } from './types'

const STEP_ORDER: WizardStep[] = ['vehicle', 'budget', 'contact', 'review']

export function ProgressSteps({ current, dict }: { current: WizardStep; dict: Dictionary }) {
  const currentIndex = STEP_ORDER.indexOf(current)
  const labels = STEP_ORDER.map((step) => dict.vehicleRequestWizard.steps[step])

  return (
    <ol className="flex items-center">
      {labels.map((label, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === labels.length - 1

        return (
          <li key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                {isCurrent && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 40 40"
                    className="absolute -inset-2 h-[52px] w-[52px] text-accent/70 [animation:step-ring-spin_3.2s_linear_infinite]"
                  >
                    <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="48 59" />
                  </svg>
                )}
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition duration-200 ${
                    isDone
                      ? 'bg-accent text-accent-foreground'
                      : isCurrent
                        ? 'border-2 border-accent text-accent shadow-glow'
                        : 'border border-border text-muted-foreground'
                  }`}
                >
                  {isDone ? <CheckIcon className="h-4 w-4" /> : index + 1}
                </span>
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <span
                className={`mx-3 h-0.5 flex-1 rounded-full transition-colors duration-200 ${isDone ? 'bg-gradient-to-r from-accent to-accent/40' : 'bg-border'}`}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
