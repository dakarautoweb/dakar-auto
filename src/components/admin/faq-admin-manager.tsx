'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { AdminFaqItem } from '@/src/services/faq/types'
import { deleteFaqItemAction, moveFaqItemAction, setFaqItemActiveAction } from '@/src/services/faq/actions'
import { isFaqCategoryKey } from '@/src/lib/faq-categories'
import { buttonClasses, cardClasses } from '@/src/components/ui/styles'
import { FaqFormModal } from './faq-form-modal'
import { FaqDeleteModal } from './faq-delete-modal'

type ModalState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; item: AdminFaqItem }

function CategoryPill({ dict, category }: { dict: Dictionary; category: string | null }) {
  const t = dict.admin.faqPage
  if (!category) return <span className="text-xs text-muted-foreground">{t.categoryNone}</span>
  const label = isFaqCategoryKey(category) ? t.categories[category] : category
  return <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{label}</span>
}

function FaqRow({
  dict,
  item,
  isFirst,
  isLast,
  onEdit,
  onDelete,
}: {
  dict: Dictionary
  item: AdminFaqItem
  isFirst: boolean
  isLast: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const t = dict.admin.faqPage
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function move(direction: 'up' | 'down') {
    startTransition(async () => {
      const result = await moveFaqItemAction(item.id, direction)
      if (result.ok) router.refresh()
    })
  }

  function toggleActive() {
    startTransition(async () => {
      const result = await setFaqItemActiveAction(item.id, !item.isActive)
      if (result.ok) router.refresh()
    })
  }

  return (
    <div className={cardClasses({ padding: 'sm', className: 'flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4' })}>
      <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
        <button
          type="button"
          onClick={() => move('up')}
          disabled={pending || isFirst}
          aria-label={t.moveUp}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition duration-200 hover:border-accent-hover hover:text-accent-hover disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => move('down')}
          disabled={pending || isLast}
          aria-label={t.moveDown}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition duration-200 hover:border-accent-hover hover:text-accent-hover disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPill dict={dict} category={item.category} />
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              item.isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-surface text-muted-foreground'
            }`}
          >
            {item.isActive ? <Eye className="h-3 w-3" strokeWidth={2} /> : <EyeOff className="h-3 w-3" strokeWidth={2} />}
            {item.isActive ? t.active : t.hidden}
          </span>
        </div>

        <p className="mt-2 text-sm font-semibold text-foreground">🇫🇷 {item.questionFr}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.answerFr}</p>

        <p className="mt-2 text-sm font-semibold text-foreground">🇬🇧 {item.questionEn}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.answerEn}</p>
      </div>

      <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
        <button
          type="button"
          onClick={toggleActive}
          disabled={pending}
          className={buttonClasses({ variant: 'secondary-muted', size: 'sm', className: 'gap-1.5' })}
        >
          {item.isActive ? <EyeOff className="h-3.5 w-3.5" strokeWidth={2} /> : <Eye className="h-3.5 w-3.5" strokeWidth={2} />}
          {item.isActive ? t.hide : t.unhide}
        </button>
        <button type="button" onClick={onEdit} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'gap-1.5' })}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          {t.edit}
        </button>
        <button type="button" onClick={onDelete} className={buttonClasses({ variant: 'danger-muted', size: 'sm', className: 'gap-1.5' })}>
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          {t.delete}
        </button>
      </div>
    </div>
  )
}

// Orchestrates the whole /admin/faq screen: the item list plus its
// create/edit modal and delete-confirm modal. Items come from the server
// component parent (getAdminFaqItems); every mutation calls router.refresh()
// on success to re-fetch that server data rather than hand-rolling optimistic
// client state — same pattern as archive-toggle-button.tsx.
export function FaqAdminManager({ dict, items }: { dict: Dictionary; items: AdminFaqItem[] }) {
  const t = dict.admin.faqPage
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' })
  const [deleteTarget, setDeleteTarget] = useState<AdminFaqItem | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleSaved() {
    setModal({ mode: 'closed' })
    router.refresh()
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    startDeleteTransition(async () => {
      const result = await deleteFaqItemAction(deleteTarget.id)
      if (result.ok) {
        setDeleteTarget(null)
        router.refresh()
      } else {
        setDeleteError(t.errorDeleteFailed)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setModal({ mode: 'create' })} className={buttonClasses({ variant: 'primary', size: 'md', className: 'gap-1.5' })}>
          <Plus className="h-4 w-4" strokeWidth={2} />
          {t.addButton}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={cardClasses({ padding: 'lg', className: 'flex flex-col items-center gap-3 text-center' })}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <HelpCircle className="h-6 w-6" strokeWidth={2} />
          </span>
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <FaqRow
              key={item.id}
              dict={dict}
              item={item}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onEdit={() => setModal({ mode: 'edit', item })}
              onDelete={() => {
                setDeleteError(null)
                setDeleteTarget(item)
              }}
            />
          ))}
        </div>
      )}

      {modal.mode !== 'closed' && (
        <FaqFormModal dict={dict} item={modal.mode === 'edit' ? modal.item : null} onClose={() => setModal({ mode: 'closed' })} onSaved={handleSaved} />
      )}

      {deleteTarget && (
        <FaqDeleteModal
          dict={dict}
          question={deleteTarget.questionFr}
          pending={deletePending}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
