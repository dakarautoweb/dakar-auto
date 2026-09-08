// Client-only. Never imported from server code, never sends the image
// anywhere — tesseract.js runs entirely in the browser (WASM). The
// package itself is only pulled in via the dynamic import() below, which
// Next.js code-splits into its own chunk, so it never touches the
// homepage/wizard's initial bundle — only loaded the moment a scan
// actually starts.
import { extractVinCandidate } from '@/src/lib/vin'

export type OcrProgress = {
  status: string
  progress: number
}

export type OcrOutcome = { candidate: string | null; rawText: string }

// Only the characters a VIN can legally contain — narrowing Tesseract's
// search space measurably improves accuracy for this specific use case
// (it stops trying to distinguish e.g. lowercase/punctuation it will never
// need, and can't return I/O/Q by construction).
const VIN_CHAR_WHITELIST = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ'

export async function recognizeVin(image: Blob, onProgress?: (progress: OcrProgress) => void): Promise<OcrOutcome> {
  const { createWorker } = await import('tesseract.js')

  const worker = await createWorker('eng', undefined, {
    logger: (message) => onProgress?.({ status: message.status, progress: message.progress }),
  })

  try {
    await worker.setParameters({ tessedit_char_whitelist: VIN_CHAR_WHITELIST })
    const {
      data: { text },
    } = await worker.recognize(image)
    return { candidate: extractVinCandidate(text), rawText: text }
  } finally {
    // Always release the worker (and its WASM instance) — leaving it
    // running would keep consuming memory after the modal closes.
    await worker.terminate()
  }
}
