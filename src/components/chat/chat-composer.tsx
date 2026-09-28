'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { SendIcon } from '@/src/components/ui/dakar-icons'
import type { Dictionary } from '@/src/i18n/dictionaries'

export const MAX_MESSAGE_LENGTH = 1000
const MAX_VISIBLE_LINES = 4

// Grows the textarea with its content up to MAX_VISIBLE_LINES, then lets it
// scroll internally. Measured from the computed line height/padding/border,
// so it stays right across the mobile (16px) and desktop (14px) text sizes.
function autoResize(el: HTMLTextAreaElement) {
  const style = getComputedStyle(el)
  const chrome = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
  const maxHeight = parseFloat(style.lineHeight) * MAX_VISIBLE_LINES + chrome
  el.style.height = 'auto'
  // border-box sizing: scrollHeight covers content + padding, not borders.
  const needed = el.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
  el.style.height = `${Math.min(needed, maxHeight)}px`
  el.style.overflowY = needed > maxHeight ? 'auto' : 'hidden'
}

// Free-text input under the chat. Enter sends, Shift+Enter adds a line
// (and Enter while an IME composition is open is left alone).
export function ChatComposer({ dict, disabled, onSend }: { dict: Dictionary['chatWidget']; disabled: boolean; onSend: (text: string) => void }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hintId = useId()
  const canSend = !disabled && value.trim().length > 0

  // Runs before paint on every value change (typing, paste, clear after send).
  useLayoutEffect(() => {
    if (textareaRef.current) autoResize(textareaRef.current)
  }, [value])

  function submit() {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="shrink-0 border-t border-border bg-card px-3 py-2.5"
    >
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor={`${hintId}-input`}>
          {dict.composer.label}
        </label>
        {/* 16px text on mobile avoids iOS zoom-on-focus. The native scrollbar
            (and its arrow buttons on Windows) is hidden; wheel, touch and
            keyboard scrolling still work once the max height is reached. */}
        <textarea
          id={`${hintId}-input`}
          ref={textareaRef}
          value={value}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={dict.composer.placeholder}
          aria-describedby={hintId}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              submit()
            }
          }}
          className="block min-w-0 flex-1 resize-none overflow-y-hidden overscroll-contain rounded-xl border border-border bg-background px-3 py-[9px] text-base leading-6 text-foreground [scrollbar-width:none] placeholder:text-muted-foreground focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:text-sm sm:leading-5 [&::-webkit-scrollbar]:hidden"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label={dict.composer.send}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition duration-200 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </div>
      <p id={hintId} className="mt-1 hidden px-1 text-[11px] text-muted-foreground sm:block">
        {dict.composer.hint}
      </p>
    </form>
  )
}
