import 'server-only'

// Obvious "I lost my request / request number / tracking link" messages are
// routed straight into the secure recovery flow without an AI call. The
// model can still detect less obvious phrasings (intent "lost_request").
const LOST = /\b(perdu|perdre|oublie|egare|retrouv\w*|lost|lose|forgot|forget|misplaced|can ?t find|cannot find)\b/
const TARGET = /\b(demande|numero|lien|suivi|reference|request|number|tracking|link)\b/
// "J'ai oublié le numéro de la pièce" / "lost my VIN" are not about a
// Dakar Auto request — left to the model.
const OTHER_SUBJECT = /\b(piece|pieces|part|parts|vin|chassis)\b/

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
}

export function isLostRequestMessage(text: string): boolean {
  const value = normalize(text)
  return LOST.test(value) && TARGET.test(value) && !OTHER_SUBJECT.test(value)
}
