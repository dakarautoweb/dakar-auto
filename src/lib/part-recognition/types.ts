// Shape for a future multimodal AI photo-recognition result. No AI
// integration exists yet — see identify-photo-modal.tsx, where this type
// is only used to type a `result` state that is never actually populated.
// Kept intentionally small: just enough fields for the result UI already
// built there (probable part name, category, subcategory, a confidence
// indicator, and a short explanation) to have something concrete to render
// once a real recognition API is wired in later.
export type PartRecognitionResult = {
  partName: string
  category: string
  subcategory: string | null
  // 0-1 — rendered as a percentage/qualitative indicator in the result UI.
  confidence: number
  explanation: string
}
