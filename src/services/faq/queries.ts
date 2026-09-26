import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/src/lib/supabase/auth-server'
import { requireAdmin } from '@/src/services/admin/auth'
import type { Locale } from '@/src/i18n/config'
import type { AdminFaqItem, PublicFaqItem } from './types'

type FaqRow = {
  id: string
  question_fr: string
  answer_fr: string
  question_en: string
  answer_en: string
  category: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

function mapAdminRow(row: FaqRow): AdminFaqItem {
  return {
    id: row.id,
    questionFr: row.question_fr,
    answerFr: row.answer_fr,
    questionEn: row.question_en,
    answerEn: row.answer_en,
    category: row.category,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Admin -> FAQ management: every item regardless of is_active, ordered the
// same way the "move up/down" controls operate on. Requires an
// authenticated admin (requireAdmin(), same gate every other admin query in
// this project uses) and is additionally enforced by the "Admins can read
// all FAQ items" RLS policy.
export async function getAdminFaqItems(): Promise<AdminFaqItem[]> {
  await requireAdmin()

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[faq] Failed to load admin FAQ items:', { code: error.code, message: error.message, details: error.details, hint: error.hint })
    return []
  }

  return ((data ?? []) as FaqRow[]).map(mapAdminRow)
}

// Public /faq page's only read path — active items only (enforced both here
// and, independently, by the "Public can read active FAQ items" RLS policy,
// so a bug here can't leak a hidden item), pre-resolved to the requested
// locale so the page/accordion never has to branch on locale itself.
//
// Wrapped in React's cache() so this only round-trips once per request even
// if multiple components on the same page need it. Never throws — a
// missing table (migration not yet applied) or query failure returns an
// empty list, which the page renders as its own empty state.
export const getPublicFaqItems = cache(async (locale: Locale): Promise<PublicFaqItem[]> => {
  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase
      .from('faq_items')
      .select('question_fr, answer_fr, question_en, answer_en')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[faq] Failed to load public FAQ items:', { code: error.code, message: error.message, details: error.details, hint: error.hint })
      return []
    }
    if (!data) return []

    return (data as Pick<FaqRow, 'question_fr' | 'answer_fr' | 'question_en' | 'answer_en'>[]).map((row) => ({
      question: locale === 'en' ? row.question_en : row.question_fr,
      answer: locale === 'en' ? row.answer_en : row.answer_fr,
    }))
  } catch (err) {
    console.error('[faq] Failed to load public FAQ items:', err instanceof Error ? err.message : 'Unknown error')
    return []
  }
})
