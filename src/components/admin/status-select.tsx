'use client'

import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { inputClass } from '@/src/components/ui/styles'
import { CheckIcon, ChevronDownIcon } from '@/src/components/home/icons'

// Generic icon-aware status combobox — a button + absolutely-positioned
// listbox (same shape as vehicle-wizard/brand-select.tsx's BrandSelect),
// styled with `inputClass` so it drops in wherever a status <select> used
// to live. Reusable across any status set (vehicle requests today, parts
// requests if it's adopted there later) — the caller supplies the status
// list, labels, icons and color classes; this component owns none of that
// data or the update logic, only the open/close/keyboard/selection UI.
export function StatusSelect({
  id,
  value,
  onChange,
  statuses,
  labels,
  icons,
  chipClasses,
  ariaLabel,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  statuses: readonly string[]
  labels: Record<string, string>
  icons: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>>
  chipClasses: Record<string, string>
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(statuses.indexOf(value), 0))
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = `${id}-listbox`
  const defaultChip = 'bg-muted-foreground/10 text-muted-foreground'

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function openAt(index: number) {
    setActiveIndex(index)
    setOpen(true)
  }

  function select(next: string) {
    onChange(next)
    setOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) openAt(Math.max(statuses.indexOf(value), 0))
        else setActiveIndex((i) => Math.min(i + 1, statuses.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openAt(Math.max(statuses.indexOf(value), 0))
        else setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (open) select(statuses[activeIndex])
        else openAt(Math.max(statuses.indexOf(value), 0))
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          setOpen(false)
        }
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  const SelectedIcon = icons[value]
  const selectedChip = chipClasses[value] ?? defaultChip

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-${statuses[activeIndex]}` : undefined}
        onClick={() => (open ? setOpen(false) : openAt(Math.max(statuses.indexOf(value), 0)))}
        onKeyDown={handleKeyDown}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${open ? 'border-accent ring-4 ring-accent/20' : ''}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {SelectedIcon && (
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${selectedChip}`}>
              <SelectedIcon className="h-4 w-4" strokeWidth={2} />
            </span>
          )}
          <span className="truncate font-medium">{labels[value] ?? value}</span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-card-hover"
        >
          {statuses.map((s, index) => {
            const Icon = icons[s]
            const isSelected = s === value
            const isActive = index === activeIndex
            return (
              <li key={s}>
                <button
                  type="button"
                  id={`${listboxId}-${s}`}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(s)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition duration-150 ${
                    isSelected
                      ? 'bg-accent-soft text-accent'
                      : isActive
                        ? 'bg-foreground/[0.08] text-foreground ring-1 ring-inset ring-accent/50'
                        : 'text-foreground hover:bg-foreground/[0.08]'
                  }`}
                >
                  {Icon && (
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chipClasses[s] ?? defaultChip}`}>
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{labels[s] ?? s}</span>
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-accent" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
