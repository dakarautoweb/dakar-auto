import type { Dictionary } from '@/src/i18n/dictionaries'
import type { WizardStep } from './types'

const STEP_ORDER: WizardStep[] = ['vehicle', 'parts', 'contact', 'review']

export function ProgressSteps({ current, dict }: { current: WizardStep; dict: Dictionary }) {
  const currentIndex = STEP_ORDER.indexOf(current)
  const labels = [
    dict.wizard.steps.vehicle,
    dict.wizard.steps.parts,
    dict.wizard.steps.contact,
    dict.wizard.steps.review,
  ]

  return (
    <ol className="flex items-center">
      {labels.map((label, index) => {
        const isDone = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === labels.length - 1

        return (
          <li key={label} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${
                  isDone
                    ? 'bg-accent text-accent-foreground'
                    : isCurrent
                      ? 'border-2 border-accent text-accent'
                      : 'border border-border text-muted-foreground'
                }`}
              >
                {isDone ? '✓' : index + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </div>
            {!isLast && <span className={`mx-3 h-px flex-1 ${isDone ? 'bg-accent' : 'bg-border'}`} />}
          </li>
        )
      })}
    </ol>
  )
}
