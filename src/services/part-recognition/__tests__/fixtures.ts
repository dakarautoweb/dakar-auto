// Tiny byte payloads with real magic numbers — enough for sniffImageMime,
// never a real photo. The trailing marker makes any accidental logging of
// the bytes/base64 easy to detect.
const MARKER = Buffer.from('DAKAR-TEST-IMAGE-PAYLOAD-0123456789', 'ascii')

export const JPEG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), MARKER])
export const PNG_BYTES = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), MARKER])
export const WEBP_BYTES = Buffer.concat([Buffer.from('RIFF', 'ascii'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBP', 'ascii'), MARKER])

export function imageFile(bytes: Buffer, type: string, name = 'part.jpg'): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

export function validModelOutput(overrides: Record<string, unknown> = {}) {
  return {
    status: 'identified',
    partName: 'Étrier de frein avant',
    category: 'braking',
    subcategory: 'brake-calipers',
    confidence: 0.92,
    needsConfirmation: false,
    explanation: 'On voit un étrier avec ses pistons et sa fixation.',
    candidates: [],
    ...overrides,
  }
}

export const ROTOR_CANDIDATE = { partName: 'Disque de frein', category: 'braking', subcategory: 'brake-rotors', confidence: 0.96 }
export const PAD_CANDIDATE = { partName: 'Plaquette de frein', category: 'braking', subcategory: 'brake-pads', confidence: 0.94 }

// What the model should return for a photo of brake rotors + brake pads.
export function multiplePartsOutput(overrides: Record<string, unknown> = {}) {
  return validModelOutput({
    status: 'multiple_parts',
    partName: 'Disque de frein',
    subcategory: 'brake-rotors',
    confidence: 0.96,
    needsConfirmation: true,
    explanation: 'On voit deux disques et un jeu de plaquettes.',
    candidates: [ROTOR_CANDIDATE, PAD_CANDIDATE],
    ...overrides,
  })
}
