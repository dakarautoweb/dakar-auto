#!/usr/bin/env node
// Production environment gate — validates that every variable a critical
// Dakar Auto feature needs is present AND well-formed, without ever printing
// a value (only names, PASS/FAIL and a generic reason).
//
//   npm run check:production-env                    # checks process.env
//   npm run check:production-env -- --env-file .env.production.local
//   npm run check:production-env -- --remote        # + live key checks (network)
//   node scripts/check-production-env.mjs --if-production
//       Used by `npm run build`: only enforced when VERCEL_ENV=production,
//       so local and preview builds never need production secrets.
//
// A variable "existing" in the Vercel UI is not enough: the value can be
// empty, quoted, contain a newline, be too short, or belong to the wrong
// project/widget. Those are exactly the cases checked here.
//
// WhatsApp is deliberately not validated yet (not production-ready).

import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const MIN_RECOVERY_SECRET_LENGTH = 32

// Cloudflare's documented dummy keys — fine locally, never in production.
const TURNSTILE_TEST_SITE_KEY = /^[123]x0{8}/
const TURNSTILE_TEST_SECRET = /^[123]x0{30,}/

function decodeJwtPayload(value) {
  const parts = value.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function supabaseKeyKind(value) {
  if (value.startsWith('sb_publishable_')) return { role: 'anon' }
  if (value.startsWith('sb_secret_')) return { role: 'service_role' }
  const payload = decodeJwtPayload(value)
  return payload && typeof payload.role === 'string' ? { role: payload.role, ref: payload.ref } : null
}

function supabaseProjectRef(url) {
  try {
    const host = new URL(url).hostname
    return host.endsWith('.supabase.co') ? host.split('.')[0] : null
  } catch {
    return null
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

// Each rule gets the raw value and the whole env; it returns null when the
// value is fine or a reason that never contains the value itself.
export const REQUIRED = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    feature: 'Supabase',
    check: (v) => (isHttpsUrl(v) ? null : 'must be an https:// URL'),
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    feature: 'Supabase',
    check: (v, env) => {
      const kind = supabaseKeyKind(v)
      if (!kind) return 'not a recognizable Supabase key'
      if (kind.role === 'service_role') return 'is a SERVICE ROLE key — it would be shipped to browsers'
      if (kind.role !== 'anon') return 'is not an anon/publishable key'
      const ref = supabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '')
      if (kind.ref && ref && kind.ref !== ref) return 'belongs to a different Supabase project than NEXT_PUBLIC_SUPABASE_URL'
      return null
    },
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    feature: 'Supabase',
    check: (v, env) => {
      const kind = supabaseKeyKind(v)
      if (!kind) return 'not a recognizable Supabase key'
      if (kind.role !== 'service_role') return 'is not a service-role/secret key'
      const ref = supabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '')
      if (kind.ref && ref && kind.ref !== ref) return 'belongs to a different Supabase project than NEXT_PUBLIC_SUPABASE_URL'
      return null
    },
  },
  { name: 'OPENAI_API_KEY', feature: 'AI chat + photo recognition', check: (v) => (v.startsWith('sk-') ? null : 'does not look like an OpenAI key (sk-…)') },
  { name: 'OPENAI_CHAT_MODEL', feature: 'AI chat', check: () => null },
  { name: 'OPENAI_PART_RECOGNITION_MODEL', feature: 'Photo recognition', check: () => null },
  {
    name: 'REQUEST_RECOVERY_SECRET',
    feature: 'Lost-request recovery',
    check: (v) => (v.length >= MIN_RECOVERY_SECRET_LENGTH ? null : `shorter than ${MIN_RECOVERY_SECRET_LENGTH} characters`),
  },
  { name: 'RESEND_API_KEY', feature: 'Email (recovery codes, confirmations)', check: (v) => (v.startsWith('re_') ? null : 'does not look like a Resend key (re_…)') },
  {
    name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
    feature: 'Turnstile',
    check: (v) => (TURNSTILE_TEST_SITE_KEY.test(v) ? 'is a Cloudflare TEST site key' : v.startsWith('0x') ? null : 'does not look like a Turnstile site key (0x…)'),
  },
  {
    name: 'TURNSTILE_SECRET_KEY',
    feature: 'Turnstile',
    check: (v) => (TURNSTILE_TEST_SECRET.test(v) ? 'is a Cloudflare TEST secret' : v.startsWith('0x') ? null : 'does not look like a Turnstile secret (0x…)'),
  },
  {
    // Every outbound email link (tracking links in customer confirmations,
    // status updates) is built from this; unset it falls back to localhost.
    name: 'NEXT_PUBLIC_APP_URL',
    feature: 'Links in customer emails',
    check: (v) => {
      if (!isHttpsUrl(v)) return 'must be the public https:// origin'
      return /^(localhost|127\.|0\.0\.0\.0)/.test(new URL(v).hostname) ? 'points at localhost' : null
    },
  },
]

// Reported but not fatal: the feature runs, just not fully.
export const RECOMMENDED = [
  {
    name: 'RESEND_FROM_EMAIL',
    feature: 'Email sender',
    missing: 'unset — the onboarding@resend.dev fallback only delivers to the Resend account owner, so real customers get no email',
  },
]

// Shape problems shared by every variable. Order matters: the first match
// is the reason reported.
function commonProblem(raw) {
  if (raw === undefined) return 'missing'
  const value = raw.trim()
  if (!value) return 'empty or whitespace only'
  if (/^(["']).*\1$/s.test(value)) return 'wrapped in quotes — paste the value without them'
  if (/[\r\n]/.test(value)) return 'contains a line break'
  return null
}

export function checkProductionEnv(env) {
  const results = []
  for (const rule of REQUIRED) {
    const raw = env[rule.name]
    const problem = commonProblem(raw) ?? rule.check(raw.trim(), env)
    results.push({ name: rule.name, feature: rule.feature, level: problem ? 'FAIL' : 'PASS', reason: problem })
  }
  for (const rule of RECOMMENDED) {
    const raw = env[rule.name]
    const problem = raw === undefined || !raw.trim() ? rule.missing : commonProblem(raw)
    results.push({ name: rule.name, feature: rule.feature, level: problem ? 'WARN' : 'PASS', reason: problem })
  }
  return { ok: results.every((r) => r.level !== 'FAIL'), results }
}

export function formatResults(results) {
  return results.map((r) => `${r.level.padEnd(4)} ${r.name}${r.reason ? ` — ${r.reason}` : ''}  [${r.feature}]`)
}

// ── Optional live checks (--remote): prove the keys are accepted by their
// providers, not just well-formed. Read-only calls; nothing is created.

async function timedFetch(url, init = {}) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
}

export const REMOTE_CHECKS = [
  {
    name: 'Supabase service role → parts_requests + vehicle_requests readable',
    run: async (env) => {
      const base = env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/+$/, '')
      const key = env.SUPABASE_SERVICE_ROLE_KEY.trim()
      for (const table of ['parts_requests', 'vehicle_requests', 'request_recovery_challenges']) {
        const res = await timedFetch(`${base}/rest/v1/${table}?select=id&limit=0`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
        if (!res.ok) return `${table}: HTTP ${res.status}`
      }
      return null
    },
  },
  {
    name: 'OpenAI key accepted + both configured models available',
    run: async (env) => {
      const key = env.OPENAI_API_KEY.trim()
      for (const variable of ['OPENAI_CHAT_MODEL', 'OPENAI_PART_RECOGNITION_MODEL']) {
        const res = await timedFetch(`https://api.openai.com/v1/models/${encodeURIComponent(env[variable].trim())}`, { headers: { Authorization: `Bearer ${key}` } })
        if (!res.ok) return `${variable}: HTTP ${res.status}`
      }
      return null
    },
  },
  {
    // A dummy token against the real secret: Cloudflare answers
    // invalid-input-response for a valid secret, invalid-input-secret for a
    // bad one. (Whether the site key pairs with this secret can only be
    // proven by solving a real challenge in a browser.)
    name: 'Turnstile secret accepted by siteverify',
    run: async (env) => {
      const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY.trim(), response: 'dakar-auto-env-check' })
      const res = await timedFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      const codes = data['error-codes'] ?? []
      if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) return 'secret rejected (invalid-input-secret)'
      return codes.includes('invalid-input-response') ? null : `unexpected answer: ${codes.join(',') || `HTTP ${res.status}`}`
    },
  },
  {
    // GET /domains is read-only. A sending-only key answers
    // restricted_api_key, which still proves the key is valid.
    name: 'Resend key accepted',
    run: async (env) => {
      const res = await timedFetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${env.RESEND_API_KEY.trim()}` } })
      if (res.ok) return null
      const data = await res.json().catch(() => ({}))
      return data.name === 'restricted_api_key' ? null : `rejected: ${data.name ?? `HTTP ${res.status}`}`
    },
  },
]

export async function runRemoteChecks(env) {
  const results = []
  for (const check of REMOTE_CHECKS) {
    let reason
    try {
      reason = await check.run(env)
    } catch (err) {
      reason = `request failed (${err instanceof Error ? err.name : 'error'})`
    }
    results.push({ name: check.name, level: reason ? 'FAIL' : 'PASS', reason })
  }
  return results
}

async function main(argv) {
  const args = argv.slice(2)
  const envFileIndex = args.indexOf('--env-file')
  if (envFileIndex !== -1) {
    const file = path.resolve(args[envFileIndex + 1] ?? '')
    if (!existsSync(file)) {
      console.error(`FAIL env file not found: ${file}`)
      return 1
    }
    process.loadEnvFile(file)
  }

  if (args.includes('--if-production') && process.env.VERCEL_ENV !== 'production') {
    console.log(`SKIP production env check (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'} — only enforced for Vercel production builds)`)
    return 0
  }

  console.log('Production environment check (values are never printed)')
  const { ok, results } = checkProductionEnv(process.env)
  for (const line of formatResults(results)) console.log(line)

  let remoteOk = true
  if (args.includes('--remote')) {
    if (!ok) {
      console.log('SKIP remote checks — fix the FAIL lines above first')
    } else {
      for (const r of await runRemoteChecks(process.env)) {
        console.log(`${r.level.padEnd(4)} ${r.name}${r.reason ? ` — ${r.reason}` : ''}`)
        if (r.level === 'FAIL') remoteOk = false
      }
    }
  }

  const passed = ok && remoteOk
  console.log(passed ? 'Production environment: OK' : 'Production environment: INVALID — fix the FAIL lines above')
  return passed ? 0 : 1
}

const invokedDirectly = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (invokedDirectly) {
  main(process.argv).then((code) => process.exit(code))
}
