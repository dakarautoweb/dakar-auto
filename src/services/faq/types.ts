// Full admin-facing shape of a public.faq_items row — includes hidden
// (is_active = false) items, since the admin managing FAQ content needs to
// see and edit those too.
export type AdminFaqItem = {
  id: string
  questionFr: string
  answerFr: string
  questionEn: string
  answerEn: string
  category: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Public-facing shape — already resolved to the caller's locale (see
// getPublicFaqItems), matching the {question, answer} prop FaqAccordion
// already expects.
export type PublicFaqItem = {
  question: string
  answer: string
}
