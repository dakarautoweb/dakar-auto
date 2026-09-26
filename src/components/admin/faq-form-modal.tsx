'use client'

import { useActionState, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, HelpCircle } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import { createFaqItemAction, updateFaqItemAction } from '@/src/services/faq/actions'
import type { SettingsActionState } from '@/src/services/admin/actions'
import type { AdminFaqItem } from '@/src/services/faq/types'
import { FAQ_CATEGORY_KEYS } from '@/src/lib/faq-categories'
import { buttonClasses, inputClass } from '@/src/components/ui/styles'
import { StatusLine } from './account-settings-forms'

const idle: SettingsActionState = { status: 'idle' }

function noopSubscribe() {
  return () => {}
}

// Same hydration-safe "mounted" check as bulk-delete-modal.tsx / send-report-modal.tsx.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

// Create/edit form for a single FAQ item, shared by both flows — `item`
// present means edit (id + all fields prefilled and submitted to
// updateFaqItemAction), absent means create (blank form, isActive defaults
// on, submitted to createFaqItemAction). Only one of these is ever mounted
// at a time from FaqAdminManager.
export function FaqFormModal({
  dict,
  item,
  onClose,
  onSaved,
}: {
  dict: Dictionary
  item: AdminFaqItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = dict.admin.faqPage
  const mounted = useMounted()
  const isEdit = item !== null
  const [state, action, pending] = useActionState(isEdit ? updateFaqItemAction : createFaqItemAction, idle)

  const errorMap: Record<string, string> = {
    missing_question_fr: t.errorMissingQuestionFr,
    missing_answer_fr: t.errorMissingAnswerFr,
    missing_question_en: t.errorMissingQuestionEn,
    missing_answer_en: t.errorMissingAnswerEn,
    save_failed: t.errorSaveFailed,
    invalid_id: t.errorSaveFailed,
  }

  useEffect(() => {
    if (state.status === 'success') onSaved()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSaved is a stable callback from the parent, only re-run when the action result changes
  }, [state])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose is a stable close-modal callback from the parent
  }, [pending])

  if (!mounted) return null

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 70 }}
      className="flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? t.editTitle : t.addTitle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onClose()
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-card-hover">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <HelpCircle className="h-4 w-4" strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold tracking-tight">{isEdit ? t.editTitle : t.addTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label={dict.admin.tableControls.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition duration-200 hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <form action={action} className="mt-5 space-y-4">
          {isEdit && <input type="hidden" name="id" value={item.id} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.questionFrLabel}>
              <input name="questionFr" required maxLength={300} defaultValue={item?.questionFr ?? ''} className={inputClass} />
            </Field>
            <Field label={t.questionEnLabel}>
              <input name="questionEn" required maxLength={300} defaultValue={item?.questionEn ?? ''} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.answerFrLabel}>
              <textarea name="answerFr" required rows={4} maxLength={2000} defaultValue={item?.answerFr ?? ''} className={inputClass} />
            </Field>
            <Field label={t.answerEnLabel}>
              <textarea name="answerEn" required rows={4} maxLength={2000} defaultValue={item?.answerEn ?? ''} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.categoryLabel}>
              <select name="category" defaultValue={item?.category ?? ''} className={inputClass}>
                <option value="">{t.categoryNone}</option>
                {FAQ_CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t.categories[key]}
                  </option>
                ))}
              </select>
            </Field>
            <label className="mt-6 flex h-[46px] cursor-pointer items-center gap-2 text-sm text-foreground select-none">
              <input type="checkbox" name="isActive" defaultChecked={item?.isActive ?? true} className="h-4 w-4 accent-accent" />
              {t.activeLabel}
            </label>
          </div>

          <StatusLine state={state} successMessage={t.saved} errorMap={errorMap} />

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={pending} className={buttonClasses({ variant: 'secondary-muted', size: 'sm' })}>
              {dict.admin.tableControls.cancel}
            </button>
            <button type="submit" disabled={pending} className={buttonClasses({ variant: 'primary', size: 'sm' })}>
              {pending ? t.saving : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
