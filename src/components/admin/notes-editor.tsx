'use client'

import { useState, useTransition } from 'react'

export type NotesEditorTexts = {
  description: string
  placeholder: string
  save: string
  saving: string
  saved: string
  error: string
}

export function NotesEditor({
  requestId,
  initialNotes,
  saveAction,
  texts,
}: {
  requestId: string
  initialNotes: string | null
  saveAction: (requestId: string, notes: string) => Promise<{ ok: boolean }>
  texts: NotesEditorTexts
}) {
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [feedback, setFeedback] = useState<'saved' | 'error' | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const result = await saveAction(requestId, notes)
      setFeedback(result.ok ? 'saved' : 'error')
    })
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{texts.description}</p>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value)
          setFeedback(null)
        }}
        placeholder={texts.placeholder}
        rows={5}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? texts.saving : texts.save}
        </button>
        {feedback === 'saved' && <span className="text-sm text-emerald-600 dark:text-emerald-400">{texts.saved}</span>}
        {feedback === 'error' && <span className="text-sm text-red-600 dark:text-red-400">{texts.error}</span>}
      </div>
    </div>
  )
}
