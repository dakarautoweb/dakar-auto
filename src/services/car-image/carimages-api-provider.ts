import 'server-only'
import {
  CARIMAGES_BASE_URL,
  CARIMAGES_FORMAT,
  CARIMAGES_TIMEOUT_MS,
  CARIMAGES_TOTAL_BUDGET_MS,
  CARIMAGES_VIEW,
} from './config'
import { buildImageLookupCandidates, classifyBodyStyle } from './build-image-lookup-candidates'
import type { CarImageLookupResult, CarImageProvider, CarImageQuery } from './types'

// Dev-only diagnostics — never shipped to production logs.
const DEV = process.env.NODE_ENV !== 'production'

// Documented (https://carimagesapi.com/docs#signed-url-single):
// GET /api/v1/signed-url?api_key=...&make=...&model=...&year=...&view=...&format=...
// -> { "url": "https://carimagesapi.com/image?make=...&...&sig=..." }
// This endpoint just signs a URL — it does NOT validate the vehicle
// against the catalog (confirmed live: it returns 200 for made-up model
// strings), so a 200 here does not by itself mean a real image exists.
// The actual image URL has to be resolved (see resolveFinalImage) to know
// that.
type SignedUrlResponse = { url?: string }

// Documented (https://carimagesapi.com/docs#model-single):
// GET /api/v1/makes/{make}/models/{model}
// -> { generations: [{ slug, name, year_start, year_end, body_type, views, images }] }
// `body_type` is the only body-style metadata this API exposes anywhere.
// Documented as requiring api_key + an `X-Api-Secret` header for
// server-side access; we only have a bare CARIMAGES_API_KEY (no separate
// secret), so this is expected to 401/403 today — handled gracefully
// (falls back to trusting candidate order, see lookup() below).
type CatalogGeneration = {
  year_start?: number
  year_end?: number | null
  body_type?: string
}
type CatalogModelResponse = {
  generations?: CatalogGeneration[]
}

type CandidateAttempt = {
  candidate: string
  outcome: 'resolved' | 'signing_failed' | 'image_not_resolved' | 'placeholder'
  finalUrl?: string | null
  httpStatus?: number
}

// Documented (https://carimagesapi.com/docs#placeholders): "The /image
// endpoint is designed to never break your <img> tags. Instead of
// returning an error, it serves a generic placeholder image" for an
// unknown make/model, monthly quota exceeded, or rate limit exceeded —
// all three conditions, same placeholder, always HTTP 200 with a valid
// image content-type. A 200+image response is therefore NOT sufficient
// evidence of a real vehicle photo; it has to be distinguished from this
// placeholder explicitly, centrally, for every candidate.
//
// Two independent signals, captured live against a deliberately
// nonexistent make/model:
//  1. (primary, robust) Real vehicle images are served via a redirect to
//     the documented CDN host (`cdn.carimagesapi.com` — "Images, logos
//     and 3D models are served from a global edge CDN"). The placeholder
//     is served directly from the apex domain with no redirect at all.
//  2. (secondary, specific) The placeholder is one fixed, byte-identical
//     file — confirmed ETag/Content-Length below, reproduced identically
//     across unrelated made-up makes/models. If the vendor ever changes
//     this asset these two constants would need updating, which is why
//     signal 1 (structural, not content-specific) is the one actually
//     relied on; this is a corroborating check, not the sole gate.
const CARIMAGES_CDN_HOST = 'cdn.carimagesapi.com'
const KNOWN_PLACEHOLDER_ETAG = '"69b15582-1976"'
const KNOWN_PLACEHOLDER_CONTENT_LENGTH = '6518'

type ResolvedImageClassification = 'real' | 'placeholder' | 'error'

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<{ status: number; body: T | null }> {
  if (timeoutMs <= 0) return { status: 0, body: null }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal })
    let body: T | null = null
    try {
      body = (await response.json()) as T
    } catch {
      // Not every response is guaranteed to have a JSON body.
    }
    return { status: response.status, body }
  } catch {
    return { status: 0, body: null }
  } finally {
    clearTimeout(timeout)
  }
}

// A signed URL always "signs" successfully even for a made-up vehicle —
// the only way to know whether it actually resolves to a real image (as
// opposed to the documented generic placeholder, see above) is to follow
// it and inspect how it resolved. Deliberately GET, not HEAD: confirmed
// live that this API returns 404 for HEAD on an otherwise-valid,
// resolvable image URL (GET returns 200) — it apparently doesn't
// implement HEAD. The image body itself isn't needed, just
// headers/status/final URL, so it's cancelled immediately after the
// response comes back.
async function classifyResolvedImage(
  signedUrl: string,
  timeoutMs: number
): Promise<{ classification: ResolvedImageClassification; finalUrl: string | null; status: number }> {
  if (timeoutMs <= 0) return { classification: 'error', finalUrl: null, status: 0 }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(signedUrl, { method: 'GET', redirect: 'follow', signal: controller.signal })
    const finalUrl = response.url
    const status = response.status
    const contentType = response.headers.get('content-type') ?? ''
    const etag = response.headers.get('etag')
    const contentLength = response.headers.get('content-length')
    await response.body?.cancel().catch(() => {})

    // HTTP success + content-type image/* is the baseline — anything
    // else (a non-2xx status, or a 200 that isn't actually an image, e.g.
    // an HTML error page some CDNs serve with a misleading 200) is
    // unambiguously not a usable photo.
    if (!response.ok || !contentType.toLowerCase().startsWith('image/')) {
      return { classification: 'error', finalUrl, status }
    }

    let resolvedHost = ''
    try {
      resolvedHost = new URL(finalUrl).hostname.toLowerCase()
    } catch {
      // malformed final URL — treat as not a confirmed real image below
    }

    const servedFromCdn = resolvedHost === CARIMAGES_CDN_HOST
    const matchesKnownPlaceholderSignature = etag === KNOWN_PLACEHOLDER_ETAG && contentLength === KNOWN_PLACEHOLDER_CONTENT_LENGTH

    if (!servedFromCdn || matchesKnownPlaceholderSignature) {
      return { classification: 'placeholder', finalUrl, status }
    }

    return { classification: 'real', finalUrl, status }
  } catch {
    return { classification: 'error', finalUrl: null, status: 0 }
  } finally {
    clearTimeout(timeout)
  }
}

function findGenerationForYear(generations: CatalogGeneration[] | undefined, year: number): CatalogGeneration | null {
  if (!generations) return null
  const currentYearCeiling = new Date().getFullYear() + 1
  return (
    generations.find((gen) => {
      const start = gen.year_start ?? -Infinity
      const end = gen.year_end ?? currentYearCeiling
      return year >= start && year <= end
    }) ?? null
  )
}

export class CarImagesApiProvider implements CarImageProvider {
  constructor(private readonly apiKey: string) {}

  async lookup(query: CarImageQuery): Promise<CarImageLookupResult> {
    const deadline = Date.now() + CARIMAGES_TOTAL_BUDGET_MS
    const candidates = buildImageLookupCandidates(query.model, query.bodyStyle)
    const canonicalBodyStyle = classifyBodyStyle(query.bodyStyle)

    if (DEV) {
      console.log(
        `[car-image] CarImages API: requested model="${query.model}" bodyStyle="${query.bodyStyle ?? '(none)'}" -> canonical=${canonicalBodyStyle ?? 'unknown'}`
      )
      console.log(`[car-image] CarImages API: candidate chain: ${candidates.join(' -> ') || '(empty)'}`)
    }

    if (candidates.length === 0) return { status: 'not_found' }

    // Best-effort generation metadata (see CatalogModelResponse comment —
    // expected to fail without a secret, handled gracefully either way).
    const generation = await this.fetchGeneration(query.make, candidates[candidates.length - 1], query.year, deadline)
    const actualBodyType = generation?.body_type?.trim() || null
    const bodyStyleMismatchDetected = Boolean(
      canonicalBodyStyle && actualBodyType && actualBodyType.toLowerCase() !== canonicalBodyStyle.toLowerCase()
    )

    if (DEV) {
      console.log(`[car-image] CarImages API: catalog generation body_type=${actualBodyType ?? 'unknown (metadata unavailable)'}`)
    }

    // Requirement: when metadata is actually available and it contradicts
    // the requested body style, never show it — no candidate is tried.
    if (bodyStyleMismatchDetected) {
      if (DEV) {
        console.log(
          `[car-image] CarImages API: body-style metadata CONTRADICTS request (requested ${canonicalBodyStyle}, catalog says ${actualBodyType}) — blocking image, no candidate tried`
        )
      }
      return { status: 'not_found' }
    }

    const chain: CandidateAttempt[] = []
    let selected: { candidate: string; imageUrl: string } | null = null

    for (const candidate of candidates) {
      const timeoutMs = Math.min(CARIMAGES_TIMEOUT_MS, deadline - Date.now())
      const signedResult = await fetchJson<SignedUrlResponse>(this.signedUrlEndpoint(query.make, candidate, query.year), timeoutMs)
      if (signedResult.status !== 200 || !signedResult.body?.url) {
        chain.push({ candidate, outcome: 'signing_failed', httpStatus: signedResult.status })
        continue
      }

      const resolveTimeoutMs = Math.min(CARIMAGES_TIMEOUT_MS, deadline - Date.now())
      const resolved = await classifyResolvedImage(signedResult.body.url, resolveTimeoutMs)
      if (resolved.classification !== 'real') {
        chain.push({
          candidate,
          outcome: resolved.classification === 'placeholder' ? 'placeholder' : 'image_not_resolved',
          finalUrl: resolved.finalUrl,
          httpStatus: resolved.status,
        })
        continue
      }

      chain.push({ candidate, outcome: 'resolved', finalUrl: resolved.finalUrl })
      selected = { candidate, imageUrl: signedResult.body.url }
      break // stop at first found
    }

    if (DEV) {
      for (const attempt of chain) {
        console.log(`[car-image] CarImages API:   [${attempt.outcome}] candidate="${attempt.candidate}" ${attempt.finalUrl ? `finalUrl=${attempt.finalUrl}` : ''}`)
      }
      console.log(`[car-image] CarImages API: which candidate succeeded: ${selected ? selected.candidate : '(none)'}`)
    }

    if (!selected) return { status: 'not_found' }
    return { status: 'found', imageUrl: selected.imageUrl }
  }

  private signedUrlEndpoint(make: string, model: string, year: number): string {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      make,
      model,
      year: String(year),
      view: CARIMAGES_VIEW,
      format: CARIMAGES_FORMAT,
    })
    return `${CARIMAGES_BASE_URL}/api/v1/signed-url?${params.toString()}`
  }

  private async fetchGeneration(make: string, baseModel: string, year: number, deadline: number): Promise<CatalogGeneration | null> {
    const timeoutMs = Math.min(CARIMAGES_TIMEOUT_MS, deadline - Date.now())
    const catalogUrl = `${CARIMAGES_BASE_URL}/api/v1/makes/${encodeURIComponent(slugify(make))}/models/${encodeURIComponent(slugify(baseModel))}?api_key=${encodeURIComponent(this.apiKey)}`
    const result = await fetchJson<CatalogModelResponse>(catalogUrl, timeoutMs)
    if (result.status === 200 && result.body) {
      return findGenerationForYear(result.body.generations, year)
    }
    if (result.status !== 404 && result.status !== 0) {
      console.error(`[car-image] CarImages API catalog request returned status ${result.status} (generation metadata unavailable)`)
    }
    return null
  }
}
