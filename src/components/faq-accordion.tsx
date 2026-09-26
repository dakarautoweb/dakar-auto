'use client'

import { useId, useState } from 'react'
import { ChevronDownIcon } from './home/icons'

export type FaqItem = { question: string; answer: string }

// Single-open accordion (classic FAQ UX — keeps the page scannable instead
// of letting every answer stack open at once). Height animates via the CSS
// grid-template-rows 0fr/1fr trick so no JS height measurement or third-
// party library is needed for the open/close transition.
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const baseId = useId()

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        const buttonId = `${baseId}-button-${index}`
        const panelId = `${baseId}-panel-${index}`
        return (
          <div
            key={index}
            className={`overflow-hidden rounded-2xl border bg-card shadow-card transition duration-200 ${
              isOpen ? 'border-accent/40' : 'border-border hover:border-accent-hover/40'
            }`}
          >
            <h3 className="text-base">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-foreground transition duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-6 sm:py-5"
              >
                <span>{item.question}</span>
                <ChevronDownIcon
                  className={`h-5 w-5 shrink-0 text-accent transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-6">{item.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
