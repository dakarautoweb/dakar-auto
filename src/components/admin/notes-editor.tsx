'use client'

import { useState, useTransition } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { buttonClasses, inputClass } from '@/src/components/ui/styles'

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
        className={inputClass}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleSave} disabled={pending} className={buttonClasses({ variant: 'primary', size: 'sm' })}>
          {pending ? texts.saving : texts.save}
        </button>
        {feedback === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4" strokeWidth={2} />
            {texts.saved}
          </span>
        )}
        {feedback === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" strokeWidth={2} />
            {texts.error}
          </span>
        )}
      </div>
    </div>
  )
}
