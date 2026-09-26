'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { requireAdmin } from '@/src/services/admin/auth'
import type { SettingsActionState } from '@/src/services/admin/actions'
import type { PostgrestError } from '@supabase/supabase-js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Logs the real Supabase error server-side (code/message/hint — e.g. 42501
// "permission denied", or an RLS policy rejection) so a failure is
// diagnosable from the server console, while callers still only ever
// return an opaque, translated error key to the browser.
function logFaqError(context: string, error: PostgrestError | null | undefined) {
  if (!error) return
  console.error(`[faq] ${context}:`, { code: error.code, message: error.message, details: error.details, hint: error.hint })
}

// The public page and the admin list are the only two consumers of this
// data — revalidate both every time a write succeeds so neither serves
// stale content until Next's own cache would otherwise expire it.
function revalidateFaqPaths() {
  revalidatePath('/faq')
  revalidatePath('/admin/faq')
}

function readFaqForm(formData: FormData) {
  return {
    questionFr: String(formData.get('questionFr') ?? '').trim(),
    answerFr: String(formData.get('answerFr') ?? '').trim(),
    questionEn: String(formData.get('questionEn') ?? '').trim(),
    answerEn: String(formData.get('answerEn') ?? '').trim(),
    category: String(formData.get('category') ?? '').trim(),
    isActive: formData.get('isActive') === 'on',
  }
}

// Server-side validation in addition to the form's own `required` attributes
// — a request forged without going through the UI (or a UI bug) can't save
// a FAQ item missing required FR/EN content.
function validateFaqForm(fields: ReturnType<typeof readFaqForm>): string | null {
  if (!fields.questionFr) return 'missing_question_fr'
  if (!fields.answerFr) return 'missing_answer_fr'
  if (!fields.questionEn) return 'missing_question_en'
  if (!fields.answerEn) return 'missing_answer_en'
  return null
}

export async function createFaqItemAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  await requireAdmin()

  const fields = readFaqForm(formData)
  const validationError = validateFaqForm(fields)
  if (validationError) return { status: 'error', error: validationError }

  const supabase = await createSupabaseServerClient()

  // New items go to the end of the list — one round trip for the current
  // max sort_order rather than trusting a client-supplied value.
  const { data: lastItem } = await supabase.from('faq_items').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const nextSortOrder = ((lastItem?.sort_order as number | undefined) ?? -1) + 1

  const { data: created, error } = await supabase
    .from('faq_items')
    .insert({
      question_fr: fields.questionFr,
      answer_fr: fields.answerFr,
      question_en: fields.questionEn,
      answer_en: fields.answerEn,
      category: fields.category || null,
      is_active: fields.isActive,
      sort_order: nextSortOrder,
    })
    .select('id')
    .maybeSingle()

  if (error || !created) {
    logFaqError('Failed to create FAQ item', error)
    return { status: 'error', error: 'save_failed' }
  }

  revalidateFaqPaths()
  return { status: 'success' }
}

export async function updateFaqItemAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  if (!UUID_PATTERN.test(id)) return { status: 'error', error: 'invalid_id' }

  const fields = readFaqForm(formData)
  const validationError = validateFaqForm(fields)
  if (validationError) return { status: 'error', error: validationError }

  const supabase = await createSupabaseServerClient()
  // `.select().maybeSingle()` surfaces an RLS-filtered write (0 rows, no
  // error) as a real failure instead of a false "saved" — same guard used
  // by every other admin write in this project (see updateSiteSettingsAction).
  const { data: updated, error } = await supabase
    .from('faq_items')
    .update({
      question_fr: fields.questionFr,
      answer_fr: fields.answerFr,
      question_en: fields.questionEn,
      answer_en: fields.answerEn,
      category: fields.category || null,
      is_active: fields.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !updated) {
    logFaqError('Failed to update FAQ item', error)
    return { status: 'error', error: 'save_failed' }
  }

  revalidateFaqPaths()
  return { status: 'success' }
}

export type FaqMutationResult = { ok: true } | { ok: false; error: string }

export async function deleteFaqItemAction(id: string): Promise<FaqMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(id)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('faq_items').delete().eq('id', id)

  if (error) {
    logFaqError('Failed to delete FAQ item', error)
    return { ok: false, error: 'delete_failed' }
  }

  revalidateFaqPaths()
  return { ok: true }
}

export async function setFaqItemActiveAction(id: string, isActive: boolean): Promise<FaqMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(id)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('faq_items')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    logFaqError('Failed to toggle FAQ item visibility', error)
    return { ok: false, error: 'update_failed' }
  }

  revalidateFaqPaths()
  return { ok: true }
}

// Reordering: swaps this item's sort_order with its immediate neighbor in
// the current sort_order/created_at ordering — the same "move up / move
// down" approach the brief asks for instead of a heavier drag-and-drop
// dependency. A no-op (still `ok: true`) at either end of the list.
export async function moveFaqItemAction(id: string, direction: 'up' | 'down'): Promise<FaqMutationResult> {
  await requireAdmin()
  if (!UUID_PATTERN.test(id)) return { ok: false, error: 'invalid_id' }

  const supabase = await createSupabaseServerClient()
  const { data: items, error } = await supabase
    .from('faq_items')
    .select('id, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !items) {
    logFaqError('Failed to load FAQ items for reorder', error)
    return { ok: false, error: 'update_failed' }
  }

  const index = items.findIndex((item) => item.id === id)
  if (index === -1) return { ok: false, error: 'not_found' }

  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= items.length) return { ok: true }

  const current = items[index] as { id: string; sort_order: number }
  const neighbor = items[swapIndex] as { id: string; sort_order: number }

  const [{ error: errorA }, { error: errorB }] = await Promise.all([
    supabase.from('faq_items').update({ sort_order: neighbor.sort_order }).eq('id', current.id),
    supabase.from('faq_items').update({ sort_order: current.sort_order }).eq('id', neighbor.id),
  ])

  if (errorA || errorB) {
    logFaqError('Failed to swap FAQ item order (A)', errorA)
    logFaqError('Failed to swap FAQ item order (B)', errorB)
    return { ok: false, error: 'update_failed' }
  }

  revalidateFaqPaths()
  return { ok: true }
}
