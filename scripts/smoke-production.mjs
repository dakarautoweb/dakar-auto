#!/usr/bin/env node
// Non-destructive production smoke suite. Safe to run repeatedly: it only
// reads pages, asks the AI one small question, and performs a recovery
// lookup for an identity that cannot exist (no challenge is created, no
// email is sent, nothing is written to the database).
//
//   npm run smoke:production                       # NEXT_PUBLIC_APP_URL
//   npm run smoke:production -- https://dakar-auto.vercel.app
//   PART_RECOGNITION_SMOKE=1 npm run smoke:production -- <url>   # + 1 paid image call
//
// Prints PASS / FAIL / SKIP per check — never secrets or customer data —
// and exits 1 if any mandatory check fails.
//
// Note: the recovery endpoint allows 5 lookups per IP per 15 minutes; this
// suite uses one per run.

import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TIMEOUT_MS = 30_000
const PAGES = ['/', '/parts', '/vehicles', '/source-a-vehicle', '/track', '/faq']
const TURNSTILE_API = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
const PART_FIXTURE = path.join(ROOT, 'public/parts/categories/suspension.webp')

export function resolveBaseUrl(args, env) {
  const explicit = args.find((a) => /^https?:\/\//.test(a))
  const raw = explicit ?? env.SMOKE_BASE_URL ?? env.NEXT_PUBLIC_APP_URL
  return raw ? raw.trim().replace(/\/+$/, '') : null
}

function fetchWithTimeout(url, init = {}) {
  return fetch(url, { redirect: 'follow', ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
}

async function readJson(res) {
  return res.json().catch(() => null)
}

// Each check returns { level: 'PASS' | 'FAIL' | 'SKIP', detail? }. Details
// are status codes and our own response codes only.
export function buildChecks(base, env) {
  const pageCache = new Map()
  async function page(pathname) {
    if (!pageCache.has(pathname)) {
      pageCache.set(pathname, (async () => {
        const res = await fetchWithTimeout(`${base}${pathname}`, { headers: { cookie: 'NEXT_LOCALE=fr' } })
        return { status: res.status, html: await res.text() }
      })())
    }
    return pageCache.get(pathname)
  }

  const checks = PAGES.map((pathname) => ({
    name: `page ${pathname}`,
    run: async () => {
      const { status, html } = await page(pathname)
      if (status !== 200) return { level: 'FAIL', detail: `HTTP ${status}` }
      if (!html.includes('Dakar Auto')) return { level: 'FAIL', detail: 'page rendered without Dakar Auto content' }
      return { level: 'PASS' }
    },
  }))

  checks.push(
    {
      name: 'Supabase connectivity (/api/health)',
      run: async () => {
        const res = await fetchWithTimeout(`${base}/api/health`)
        const body = await readJson(res)
        return res.status === 200 && body?.ok === true ? { level: 'PASS' } : { level: 'FAIL', detail: `HTTP ${res.status}` }
      },
    },
    {
      name: 'chat widget AI enabled in rendered page',
      run: async () => {
        const { html } = await page('/')
        if (/aiEnabled\\?":true/.test(html)) return { level: 'PASS' }
        return { level: 'FAIL', detail: /aiEnabled\\?":false/.test(html) ? 'server rendered aiEnabled=false (OPENAI_API_KEY not seen at runtime)' : 'chat widget props not found' }
      },
    },
    {
      name: 'AI chat — real OpenAI request ("Qu’est-ce qu’un VIN ?")',
      run: async () => {
        const res = await fetchWithTimeout(`${base}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: 'Qu’est-ce qu’un VIN ?' }], locale: 'fr', pathname: '/' }),
        })
        const body = await readJson(res)
        if (res.status === 200 && body?.ok === true && typeof body.reply?.message === 'string' && body.reply.message.trim()) return { level: 'PASS' }
        return { level: 'FAIL', detail: `HTTP ${res.status} ${body?.error ?? 'malformed response'}` }
      },
    },
    {
      name: 'recovery endpoint status (runtime config)',
      run: async () => {
        const res = await fetchWithTimeout(`${base}/api/chat/recovery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', locale: 'fr' }),
        })
        const body = await readJson(res)
        if (res.status === 200 && body?.status === 'ready') return { level: 'PASS' }
        // Deployments from before the status action answer invalid_input;
        // the lookup check below still covers them.
        if (res.status === 400 && body?.status === 'invalid_input') return { level: 'SKIP', detail: 'deployment predates the status action' }
        return { level: 'FAIL', detail: `HTTP ${res.status} ${body?.status ?? 'malformed response'} — see "[request-recovery] unavailable" in the Vercel logs` }
      },
    },
    {
      // Hits both parts_requests and vehicle_requests with the service role.
      // not_found is the only correct answer; unavailable is exactly the
      // regression this guards against.
      name: 'recovery backend lookup',
      run: async () => {
        const nonce = randomBytes(6).toString('hex')
        const res = await fetchWithTimeout(`${base}/api/chat/recovery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'lookup', contact: `smoke-${nonce}@example.invalid`, lastName: `SmokeNeverExists${nonce.replace(/\d/g, '')}`, locale: 'fr' }),
        })
        const body = await readJson(res)
        if (res.status === 200 && body?.status === 'not_found') return { level: 'PASS', detail: 'not_found as expected' }
        if (res.status === 429) return { level: 'FAIL', detail: 'rate limited (5 lookups / 15 min per IP) — rerun later' }
        return { level: 'FAIL', detail: `HTTP ${res.status} ${body?.status ?? 'malformed response'}` }
      },
    },
    {
      name: 'tracking page ships the Turnstile integration',
      run: async () => {
        const { html } = await page('/track')
        const scripts = [...new Set(html.match(/\/_next\/static\/[^"'\s\\]+\.js/g) ?? [])]
        let sawLoader = false
        let siteKeyKind = null
        for (const src of scripts) {
          const js = await (await fetchWithTimeout(`${base}${src}`)).text()
          if (js.includes('challenges.cloudflare.com/turnstile/v0/api.js')) sawLoader = true
          // Only the key's kind is reported, never the key.
          if (/["'][123]x0{8}[A-Za-z0-9_-]*["']/.test(js)) siteKeyKind = 'test'
          else if (!siteKeyKind && /["']0x4[A-Za-z0-9_-]{10,}["']/.test(js)) siteKeyKind = 'production'
          if (sawLoader && siteKeyKind) break
        }
        if (!sawLoader) return { level: 'FAIL', detail: 'Turnstile loader not found in /track bundles' }
        if (siteKeyKind === 'test') return { level: 'FAIL', detail: 'build carries a Cloudflare TEST site key' }
        if (!siteKeyKind) return { level: 'FAIL', detail: 'no site key inlined — NEXT_PUBLIC_TURNSTILE_SITE_KEY missing at build time' }
        return { level: 'PASS', detail: 'production site key inlined' }
      },
    },
    {
      name: 'Cloudflare Turnstile api.js reachable',
      run: async () => {
        const res = await fetchWithTimeout(TURNSTILE_API)
        return res.ok ? { level: 'PASS' } : { level: 'FAIL', detail: `HTTP ${res.status}` }
      },
    },
    {
      name: 'real Turnstile challenge',
      run: async () => ({ level: 'SKIP', detail: 'manual browser check required (see docs/production-readiness.md)' }),
    },
  )

  if (env.PART_RECOGNITION_SMOKE === '1') {
    checks.push({
      name: 'photo AI — real OpenAI image request',
      run: async () => {
        const form = new FormData()
        form.set('image', new Blob([readFileSync(PART_FIXTURE)], { type: 'image/webp' }), 'suspension.webp')
        form.set('locale', 'fr')
        const res = await fetchWithTimeout(`${base}/api/part-recognition`, { method: 'POST', body: form })
        const body = await readJson(res)
        return res.status === 200 && body?.ok === true ? { level: 'PASS' } : { level: 'FAIL', detail: `HTTP ${res.status} ${body?.error ?? 'malformed response'}` }
      },
    })
  } else {
    checks.push(
      {
        // No image → the endpoint must get past its configuration check and
        // reject the request itself (missing_image), without calling OpenAI.
        name: 'photo AI endpoint configured (no paid call)',
        run: async () => {
          const form = new FormData()
          form.set('locale', 'fr')
          const res = await fetchWithTimeout(`${base}/api/part-recognition`, { method: 'POST', body: form })
          const body = await readJson(res)
          if (res.status === 400 && body?.error === 'missing_image') return { level: 'PASS' }
          return { level: 'FAIL', detail: `HTTP ${res.status} ${body?.error ?? 'malformed response'}` }
        },
      },
      { name: 'photo AI real recognition', run: async () => ({ level: 'SKIP', detail: 'enable PART_RECOGNITION_SMOKE=1' }) },
    )
  }

  return checks
}

export async function runChecks(checks, log = console.log) {
  let failed = 0
  for (const check of checks) {
    let result
    try {
      result = await check.run()
    } catch (err) {
      result = { level: 'FAIL', detail: `request failed (${err instanceof Error ? err.name : 'error'})` }
    }
    if (result.level === 'FAIL') failed += 1
    log(`${result.level.padEnd(4)} ${check.name}${result.detail ? ` — ${result.detail}` : ''}`)
  }
  return failed
}

async function main(argv) {
  const base = resolveBaseUrl(argv.slice(2), process.env)
  if (!base) {
    console.error('FAIL no target — pass a URL or set NEXT_PUBLIC_APP_URL / SMOKE_BASE_URL')
    return 1
  }
  console.log(`Smoke target: ${base}`)
  const failed = await runChecks(buildChecks(base, process.env))
  console.log(failed ? `${failed} mandatory check(s) FAILED` : 'All mandatory checks passed')
  return failed ? 1 : 0
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (invokedDirectly) {
  main(process.argv).then((code) => process.exit(code))
}
