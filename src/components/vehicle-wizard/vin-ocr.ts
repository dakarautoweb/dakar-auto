// Client-only. Never imported from server code, never sends the image
// anywhere — tesseract.js runs entirely in the browser (WASM). The
// package itself is only pulled in via the dynamic import() below, which
// Next.js code-splits into its own chunk, so it never touches the
// homepage/wizard's initial bundle — only loaded the moment a scan
// actually starts.
import { isValidVin, vinChecksumStatus, type VinChecksumStatus } from '@/src/lib/vin'

export type OcrProgress = {
  status: string
  progress: number
}

export type OcrPassResult = {
  label: string
  rawText: string
  confidence: number
  blob: Blob
}

export type OcrCandidate = {
  vin: string
  weight: number
  passLabel: string
  corrected: boolean
}

export type OcrOutcome = {
  candidate: string | null
  confident: boolean
  qualityScore: number
  rawText: string
  normalized: string
  bestPassLabel: string
  bestPassConfidence: number
  checksum: VinChecksumStatus
  passes: OcrPassResult[]
  candidates: OcrCandidate[]
}

// Consensus quality (0-100, see buildConsensus) at or above this is shown
// to the user as a confident "VIN Detected"; below it, the same candidate
// is still offered but framed as "Possible VIN — please verify" since the
// passes disagreed with each other more than we'd like. Either way the
// result is always editable before use (see ScanVinModal) — that review
// step is the real safety net, not this number.
export const CONFIDENT_QUALITY_THRESHOLD = 70

export type QualityIssue = 'blurry' | 'too-dark' | 'too-small'

export type QualityCheck = {
  ok: boolean
  issue?: QualityIssue
  metrics: { sharpness: number; brightness: number; height: number }
}

// Heuristic, conservative thresholds — deliberately biased toward NOT
// blocking a capture, since a wrongly-rejected good photo is more
// frustrating than letting a mediocre one through to OCR (which still
// requires the user to review the result before it's used). Tune these
// against real device captures; they are not derived from a calibrated
// dataset.
export const QUALITY_THRESHOLDS = {
  // Variance of the discrete Laplacian on a downscaled grayscale frame.
  // Sharp text edges produce high local variance; a blurred photo is
  // smoothed out and scores low. ~6 is low enough that a merely "not
  // perfectly crisp" photo still passes — it's aimed at genuinely
  // motion-blurred or out-of-focus captures.
  minSharpness: 6,
  // Mean grayscale value (0-255) of the downscaled frame.
  minBrightness: 35,
  // Native pixel height of the *crop itself* (i.e. video.videoHeight *
  // GUIDE_BAND.height in the modal) — not the upscaled working image.
  // Below this, individual character strokes are at or under a pixel
  // before any upscaling, which no amount of preprocessing recovers.
  minCropHeight: 40,
}

// Only the characters a VIN can legally contain — narrowing Tesseract's
// search space measurably improves accuracy for this specific use case
// (it stops trying to distinguish e.g. lowercase/punctuation it will never
// need, and can't return I/O/Q by construction). Kept identical across all
// OCR passes per product requirement.
const VIN_CHAR_WHITELIST = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'

// Conservative OCR-confusion corrections, used ONLY as a fallback when a
// pass's text contains no already-valid 17-char run at all (see
// findCorrectableVinRun) — never applied to a character that's already a
// valid VIN character, and never used to alter a candidate that didn't
// need it.
const CONFUSION_MAP: Record<string, string> = {
  O: '0',
  Q: '0',
  I: '1',
  L: '1',
  S: '5',
  B: '8',
  Z: '2',
  G: '6',
  T: '7',
}

const VIN_CHARSET_RE = /^[A-HJ-NPR-Z0-9]$/

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, value))
}

// --- Pixel-level preprocessing building blocks -----------------------

function toGrayscale(imageData: ImageData) {
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    d[i] = gray
    d[i + 1] = gray
    d[i + 2] = gray
  }
}

function applyContrast(imageData: ImageData, factor: number) {
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp255((d[i] - 128) * factor + 128)
    d[i + 1] = d[i]
    d[i + 2] = d[i]
  }
}

// 3x3 median filter — removes salt-and-pepper sensor/compression noise
// without smearing edges the way a mean blur would. Run at native
// resolution (before upscaling) where it's cheap; an O(w*h) pass with a
// 9-element sort per pixel is trivial at crop size but would be wasteful
// after a 3-4x upscale.
function applyMedianDenoise3x3(imageData: ImageData) {
  const { width, height, data } = imageData
  const src = Uint8ClampedArray.from(data)
  const window = new Uint8ClampedArray(9)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let k = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          window[k] = src[((y + ky) * width + (x + kx)) * 4]
          k++
        }
      }
      for (let i = 1; i < 9; i++) {
        const val = window[i]
        let j = i - 1
        while (j >= 0 && window[j] > val) {
          window[j + 1] = window[j]
          j--
        }
        window[j + 1] = val
      }
      const median = window[4]
      const idx = (y * width + x) * 4
      data[idx] = median
      data[idx + 1] = median
      data[idx + 2] = median
    }
  }
}

// Cheap 3x3 box blur — used only as a "mild blur before threshold" smooth
// to suppress upscale/JPEG ringing artifacts right before binarization,
// not a general-purpose denoiser (that's applyMedianDenoise3x3's job).
function applyBoxBlur3x3(imageData: ImageData) {
  const { width, height, data } = imageData
  const src = Uint8ClampedArray.from(data)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += src[((y + ky) * width + (x + kx)) * 4]
        }
      }
      const avg = sum / 9
      const idx = (y * width + x) * 4
      data[idx] = avg
      data[idx + 1] = avg
      data[idx + 2] = avg
    }
  }
}

// Simple 3x3 unsharp kernel. Operates on a copy of the source so each
// output pixel is computed from the original (unsharpened) neighborhood,
// not from already-modified neighbors.
function applySharpen(imageData: ImageData) {
  const { width, height, data } = imageData
  const src = new Uint8ClampedArray(data)
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0
      let k = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += src[((y + ky) * width + (x + kx)) * 4] * kernel[k]
          k++
        }
      }
      const idx = (y * width + x) * 4
      const v = clamp255(sum)
      data[idx] = v
      data[idx + 1] = v
      data[idx + 2] = v
    }
  }
}

// Summed-area table over the (already grayscale) red channel, letting any
// box's mean be computed in O(1) regardless of radius — the shared
// building block for both local contrast enhancement and adaptive
// thresholding below, so neither needs an O(radius^2)-per-pixel blur.
function buildIntegralImage(imageData: ImageData): Float64Array {
  const { width, height, data } = imageData
  const integral = new Float64Array((width + 1) * (height + 1))
  const stride = width + 1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const g = data[(y * width + x) * 4]
      integral[(y + 1) * stride + (x + 1)] =
        g + integral[y * stride + (x + 1)] + integral[(y + 1) * stride + x] - integral[y * stride + x]
    }
  }
  return integral
}

function localMeanMap(imageData: ImageData, radius: number): Float64Array {
  const { width, height } = imageData
  const integral = buildIntegralImage(imageData)
  const stride = width + 1
  const means = new Float64Array(width * height)
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(height - 1, y + radius)
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      const sum =
        integral[(y1 + 1) * stride + (x1 + 1)] -
        integral[y0 * stride + (x1 + 1)] -
        integral[(y1 + 1) * stride + x0] +
        integral[y0 * stride + x0]
      const count = (x1 - x0 + 1) * (y1 - y0 + 1)
      means[y * width + x] = sum / count
    }
  }
  return means
}

// Local contrast enhancement: pushes each pixel away from its local
// neighborhood average instead of the image-wide average (applyContrast),
// so it also compensates for uneven lighting/shadow across the plate
// rather than just boosting global contrast.
function applyLocalContrast(imageData: ImageData, radius: number, strength: number) {
  const means = localMeanMap(imageData, radius)
  const { width, height, data } = imageData
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const v = data[i * 4]
      const enhanced = clamp255(v + strength * (v - means[i]))
      data[i * 4] = enhanced
      data[i * 4 + 1] = enhanced
      data[i * 4 + 2] = enhanced
    }
  }
}

// Bradley-Roth adaptive thresholding: a pixel becomes ink (0) when it's
// darker than its own local neighborhood mean by more than `c`, background
// (255) otherwise. Unlike a single global Otsu cut, this holds up under
// uneven lighting/glare across the plate (one corner bright, one in
// shadow) because the threshold itself varies across the image.
function applyAdaptiveThreshold(imageData: ImageData, radius: number, c: number) {
  const means = localMeanMap(imageData, radius)
  const { width, height, data } = imageData
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const v = data[i * 4]
      const out = v < means[i] - c ? 0 : 255
      data[i * 4] = out
      data[i * 4 + 1] = out
      data[i * 4 + 2] = out
    }
  }
}

// Otsu's method: picks the single grayscale threshold that best separates
// the image into two classes (ink vs. background) by maximizing
// between-class variance.
function computeOtsuThreshold(imageData: ImageData): number {
  const hist = new Array(256).fill(0)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) hist[d[i]]++

  const total = d.length / 4
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]

  let sumB = 0
  let wB = 0
  let maxVariance = 0
  let threshold = 127

  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const meanB = sumB / wB
    const meanF = (sum - sumB) / wF
    const variance = wB * wF * (meanB - meanF) * (meanB - meanF)
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return threshold
}

function applyGlobalThreshold(imageData: ImageData, threshold: number) {
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] > threshold ? 255 : 0
    d[i] = v
    d[i + 1] = v
    d[i + 2] = v
  }
}

// Auto black/white polarity normalization: VIN plates/labels are
// sometimes dark text on a light background (embossed metal, printed
// sticker) and sometimes light text on dark (some stamped/painted
// plates). Tesseract's model expects the former. Sampling the outer
// border of the crop as a proxy for "background" (VIN characters are
// rarely flush against the very edge of our guide-band crop) and
// comparing it to the overall mean tells us which case we're in, so we
// can invert only when it actually helps instead of hand-picking it.
function shouldInvertForDarkBackground(imageData: ImageData): boolean {
  const { width, height, data } = imageData
  const margin = Math.max(2, Math.round(Math.min(width, height) * 0.08))
  let borderSum = 0
  let borderCount = 0
  let totalSum = 0
  for (let y = 0; y < height; y++) {
    const onBorderRow = y < margin || y >= height - margin
    for (let x = 0; x < width; x++) {
      const v = data[(y * width + x) * 4]
      totalSum += v
      if (onBorderRow || x < margin || x >= width - margin) {
        borderSum += v
        borderCount++
      }
    }
  }
  const totalMean = totalSum / (width * height)
  const borderMean = borderCount > 0 ? borderSum / borderCount : totalMean
  return borderMean < totalMean - 10
}

function invert(imageData: ImageData) {
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const v = 255 - d[i]
    d[i] = v
    d[i + 1] = v
    d[i + 2] = v
  }
}

// --- Image quality gate (runs BEFORE any OCR work) --------------------

function computeSharpness(imageData: ImageData): number {
  const { width, height, data } = imageData
  let sum = 0
  let sumSq = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const center = data[idx]
      const up = data[((y - 1) * width + x) * 4]
      const down = data[((y + 1) * width + x) * 4]
      const left = data[(y * width + x - 1) * 4]
      const right = data[(y * width + x + 1) * 4]
      const laplacian = 4 * center - up - down - left - right
      sum += laplacian
      sumSq += laplacian * laplacian
      count++
    }
  }
  if (count === 0) return 0
  const mean = sum / count
  return sumSq / count - mean * mean
}

function computeBrightness(imageData: ImageData): number {
  const { data } = imageData
  let sum = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) sum += data[i]
  return n > 0 ? sum / n : 0
}

// Cheap pre-check on the raw crop, before building any preprocessing
// passes or touching Tesseract at all: rejects captures that have no
// realistic chance of OCRing correctly (too blurry, too dark, or the VIN
// band too small in frame) so we can ask for a better photo instead of
// feeding noise through 4 Tesseract passes for nothing.
export async function assessImageQuality(image: Blob): Promise<QualityCheck> {
  const bitmap = await createImageBitmap(image)
  try {
    const nativeHeight = bitmap.height
    const maxDim = 400
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { ok: true, metrics: { sharpness: -1, brightness: -1, height: nativeHeight } }
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    toGrayscale(imageData)

    const sharpness = computeSharpness(imageData)
    const brightness = computeBrightness(imageData)
    const metrics = { sharpness, brightness, height: nativeHeight }

    if (nativeHeight < QUALITY_THRESHOLDS.minCropHeight) return { ok: false, issue: 'too-small', metrics }
    if (brightness < QUALITY_THRESHOLDS.minBrightness) return { ok: false, issue: 'too-dark', metrics }
    if (sharpness < QUALITY_THRESHOLDS.minSharpness) return { ok: false, issue: 'blurry', metrics }
    return { ok: true, metrics }
  } finally {
    bitmap.close()
  }
}

// --- Building the OCR passes -------------------------------------------

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob returned null'))
    }, 'image/png')
  })
}

function drawAt(
  source: ImageBitmap | HTMLCanvasElement,
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return { canvas, ctx }
}

// Adaptive upscale factor (effectively "testing" 2x/3x/4x per the product
// ask, but by picking the right one for this input instead of running all
// three as separate heavy passes): targets a working height around 180px
// for the cropped text line, since that's comfortably enough pixels per
// character stroke for Tesseract regardless of how close/far the original
// capture was, clamped to a sane 2x-4x range either way.
const TARGET_WORKING_HEIGHT = 180
const MIN_SCALE = 2
const MAX_SCALE = 4

function pickUpscaleFactor(nativeHeight: number): number {
  const raw = TARGET_WORKING_HEIGHT / Math.max(1, nativeHeight)
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw))
}

type PassSource = { label: string; blob: Blob }

// Builds 4 passes — enough diversity to cover the main failure modes
// (uneven contrast, genuine blur needing sharpening, uniform lighting
// needing a hard threshold, uneven lighting/glare needing an adaptive
// one) without running so many heavy Tesseract recognitions that an
// iPhone visibly stalls.
async function buildOcrPasses(image: Blob): Promise<PassSource[]> {
  const bitmap = await createImageBitmap(image)
  try {
    // Denoise at native resolution (cheap) before upscaling (expensive to
    // denoise after — see applyMedianDenoise3x3's comment).
    const { canvas: nativeCanvas, ctx: nativeCtx } = drawAt(bitmap, bitmap.width, bitmap.height)
    const nativeImageData = nativeCtx.getImageData(0, 0, bitmap.width, bitmap.height)
    toGrayscale(nativeImageData)
    applyMedianDenoise3x3(nativeImageData)
    nativeCtx.putImageData(nativeImageData, 0, 0)

    const scale = pickUpscaleFactor(bitmap.height)
    const workingWidth = Math.round(bitmap.width * scale)
    const workingHeight = Math.round(bitmap.height * scale)

    const freshUpscaled = () => {
      const { canvas, ctx } = drawAt(nativeCanvas, workingWidth, workingHeight)
      return { canvas, ctx, imageData: ctx.getImageData(0, 0, workingWidth, workingHeight) }
    }

    const results: PassSource[] = []

    // Pass "contrast": local contrast enhancement only, no sharpen/
    // threshold — closest to a cleaned-up original.
    {
      const { canvas, ctx, imageData } = freshUpscaled()
      applyLocalContrast(imageData, 12, 0.6)
      applyContrast(imageData, 1.1)
      ctx.putImageData(imageData, 0, 0)
      results.push({ label: 'contrast', blob: await canvasToBlob(canvas) })
    }

    // Pass "sharpen": local contrast + unsharp kernel — for genuinely
    // soft/slightly blurred captures.
    {
      const { canvas, ctx, imageData } = freshUpscaled()
      applyLocalContrast(imageData, 12, 0.6)
      applySharpen(imageData)
      ctx.putImageData(imageData, 0, 0)
      results.push({ label: 'sharpen', blob: await canvasToBlob(canvas) })
    }

    // Pass "otsu": mild blur + single global threshold — best for evenly
    // lit plates.
    {
      const { canvas, ctx, imageData } = freshUpscaled()
      applyBoxBlur3x3(imageData)
      if (shouldInvertForDarkBackground(imageData)) invert(imageData)
      const threshold = computeOtsuThreshold(imageData)
      applyGlobalThreshold(imageData, threshold)
      ctx.putImageData(imageData, 0, 0)
      results.push({ label: 'otsu', blob: await canvasToBlob(canvas) })
    }

    // Pass "adaptive": mild blur + local/adaptive threshold — holds up
    // under uneven lighting or glare across the plate that would break a
    // single global cut.
    {
      const { canvas, ctx, imageData } = freshUpscaled()
      applyBoxBlur3x3(imageData)
      if (shouldInvertForDarkBackground(imageData)) invert(imageData)
      applyAdaptiveThreshold(imageData, 15, 8)
      ctx.putImageData(imageData, 0, 0)
      results.push({ label: 'adaptive', blob: await canvasToBlob(canvas) })
    }

    return results
  } finally {
    bitmap.close()
  }
}

// --- Candidate extraction & consensus -----------------------------------

function cleanOcrText(rawText: string): string {
  return rawText.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

// Every already-valid 17-char window in the cleaned text — not just the
// first — so a single pass contributes all plausible readings, not one
// arbitrarily-chosen one.
function findAllValidVinRuns(cleaned: string): string[] {
  const found: string[] = []
  for (let i = 0; i + 17 <= cleaned.length; i++) {
    const window = cleaned.slice(i, i + 17)
    if (isValidVin(window)) found.push(window)
  }
  return found
}

// Fallback only: reached when a pass produced no already-valid window at
// all. Replaces just the characters that are NOT valid VIN characters
// using the confusion map, per window, and keeps it only if that's enough
// to produce a valid VIN. A character that's already valid is never
// touched.
function findCorrectableVinRun(cleaned: string): string | null {
  for (let i = 0; i + 17 <= cleaned.length; i++) {
    const window = cleaned.slice(i, i + 17)
    let corrected = ''
    for (const ch of window) {
      corrected += VIN_CHARSET_RE.test(ch) ? ch : CONFUSION_MAP[ch] ?? ch
    }
    if (isValidVin(corrected)) return corrected
  }
  return null
}

// Weighted per-position majority vote across every candidate from every
// pass. This only works because every candidate is, by construction,
// exactly 17 characters (we only ever consider 17-char windows) — so
// position i of one candidate always lines up with position i of another
// with no sequence-alignment needed. It's not robust to a pass that
// dropped/inserted a character earlier in the string (which would shift
// that pass's windows out of true alignment with the others), but with
// several independent passes a true misread is rarely unanimous, so the
// majority position-vote still recovers the right character in practice.
function buildConsensus(candidates: OcrCandidate[], totalPasses: number): { vin: string | null; quality: number } {
  if (candidates.length === 0) return { vin: null, quality: 0 }

  const positionWeights: Array<Map<string, number>> = Array.from({ length: 17 }, () => new Map())
  for (const candidate of candidates) {
    for (let i = 0; i < 17; i++) {
      const ch = candidate.vin[i]
      positionWeights[i].set(ch, (positionWeights[i].get(ch) ?? 0) + candidate.weight)
    }
  }

  let vin = ''
  let agreementSum = 0
  for (let i = 0; i < 17; i++) {
    let bestChar = ''
    let bestWeight = -1
    let totalWeight = 0
    for (const [ch, weight] of positionWeights[i]) {
      totalWeight += weight
      if (weight > bestWeight) {
        bestWeight = weight
        bestChar = ch
      }
    }
    vin += bestChar
    agreementSum += totalWeight > 0 ? bestWeight / totalWeight : 0
  }
  const agreementQuality = (agreementSum / 17) * 100

  // A candidate from a single pass trivially "agrees with itself" at
  // every position — that's not corroboration, it's just one guess with
  // nothing to contradict it, and scoring that as high confidence would
  // be actively misleading (confirmed by regression testing: a lone
  // misread pass produced a 100%-agreement score despite being wrong).
  // Require at least half of the passes to have contributed a candidate
  // before the score is allowed to reach its full value; with only one
  // contributing pass it's capped at half, which — combined with
  // CONFIDENT_QUALITY_THRESHOLD — reliably pushes a lone guess into the
  // "uncertain, please verify" bucket instead of presenting as confident.
  const contributingPasses = new Set(candidates.map((c) => c.passLabel)).size
  const requiredForFullCoverage = Math.max(1, Math.ceil(totalPasses / 2))
  const coverage = Math.min(1, contributingPasses / requiredForFullCoverage)

  const quality = Math.round(agreementQuality * coverage)
  return { vin, quality }
}

export async function recognizeVin(image: Blob, onProgress?: (progress: OcrProgress) => void): Promise<OcrOutcome> {
  const { createWorker, PSM } = await import('tesseract.js')
  const passSources = await buildOcrPasses(image)

  let currentPassIndex = 0
  const worker = await createWorker('eng', undefined, {
    logger: (message) => {
      if (message.status !== 'recognizing text') return
      onProgress?.({ status: message.status, progress: (currentPassIndex + message.progress) / passSources.length })
    },
  })

  try {
    await worker.setParameters({
      tessedit_char_whitelist: VIN_CHAR_WHITELIST,
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    })

    const passes: OcrPassResult[] = []
    const candidates: OcrCandidate[] = []

    for (let i = 0; i < passSources.length; i++) {
      currentPassIndex = i
      const { label, blob } = passSources[i]
      const {
        data: { text, confidence },
      } = await worker.recognize(blob)

      passes.push({ label, rawText: text, confidence, blob })

      // Tesseract.js's page-level confidence is frequently 0 even on a
      // decent read (observed on synthetic-fixture testing), so it's used
      // as a multiplier on top of a floor rather than the sole weight —
      // otherwise a single unlucky confidence=0 pass would be silently
      // zeroed out of the vote entirely regardless of what it actually
      // read.
      const baseWeight = 0.2 + 0.8 * (Math.max(0, confidence) / 100)

      const normalized = cleanOcrText(text)
      const directRuns = findAllValidVinRuns(normalized)
      if (directRuns.length > 0) {
        for (const vin of directRuns) {
          candidates.push({ vin, weight: baseWeight, passLabel: label, corrected: false })
        }
      } else {
        const corrected = findCorrectableVinRun(normalized)
        if (corrected) {
          candidates.push({ vin: corrected, weight: baseWeight * 0.4, passLabel: label, corrected: true })
        }
      }
    }

    const { vin: consensusVin, quality } = buildConsensus(candidates, passes.length)
    const candidate = consensusVin && isValidVin(consensusVin) ? consensusVin : null

    const bestPass = [...passes].sort((a, b) => b.confidence - a.confidence)[0]

    return {
      candidate,
      confident: candidate !== null && quality >= CONFIDENT_QUALITY_THRESHOLD,
      qualityScore: candidate !== null ? quality : 0,
      rawText: bestPass?.rawText ?? '',
      normalized: bestPass ? cleanOcrText(bestPass.rawText) : '',
      bestPassLabel: bestPass?.label ?? '',
      bestPassConfidence: bestPass?.confidence ?? 0,
      checksum: candidate ? vinChecksumStatus(candidate) : 'not-applicable',
      passes,
      candidates,
    }
  } finally {
    // Always release the worker (and its WASM instance) — leaving it
    // running would keep consuming memory after the modal closes.
    await worker.terminate()
  }
}
