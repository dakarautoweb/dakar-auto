// Structural config for the optional FAQ category picker in the admin FAQ
// form — same split as src/lib/parts-catalog.ts: this file only carries the
// non-localized key list, localized labels live in the i18n dictionaries
// (admin.faqPage.categories) keyed by the same string. A FAQ item's
// `category` column is free-form text, not a DB enum, so adding a new key
// here (plus its dictionary label) is enough to extend the list — no
// migration required.
export const FAQ_CATEGORY_KEYS = ['general', 'parts', 'vehicleSourcing', 'tracking'] as const

export type FaqCategoryKey = (typeof FAQ_CATEGORY_KEYS)[number]

export function isFaqCategoryKey(value: string): value is FaqCategoryKey {
  return (FAQ_CATEGORY_KEYS as readonly string[]).includes(value)
}
