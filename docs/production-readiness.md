# Production readiness — Dakar Auto

## The release rule

A critical feature is **READY** only when all four hold:

1. **Code tests pass** — `npm test`
2. **Production config check passes** — `npm run check:production-env` (runs
   automatically in every Vercel *production* build and fails it)
3. **Non-destructive production smoke passes** — `npm run smoke:production -- <url>`
4. **Real end-to-end passes** wherever an external integration is involved

Unit tests alone never make a feature ready. A variable that "exists" in the
Vercel UI is not proof the runtime sees a valid value.

Examples of step 4:

- **Recovery:** real database + real Resend + a real OTP received and verified.
- **Turnstile:** a real challenge solved in a production browser + server verification accepted.
- **WhatsApp:** real production WABA + real number + real template delivery.

Vercel binds environment variables when a deployment is **created**. Adding or
editing a variable does nothing for the running deployment — redeploy, then
re-run the smoke suite. `NEXT_PUBLIC_*` values are also inlined into the
browser bundle at build time.

## Commands

| Command | What it does | Cost / side effects |
|---|---|---|
| `npm test` | Unit + integration tests (Vitest) | none |
| `npm run check:production-env` | Validates presence **and shape** of every required variable; never prints values | none |
| `npm run check:production-env -- --env-file <file>` | Same, against a pulled env file (e.g. `vercel env pull .env.production.local --environment=production`) | none |
| `npm run check:production-env -- --env-file <file> --remote` | Also asks each provider whether the key is accepted (Supabase tables readable, OpenAI key + both models, Turnstile secret, Resend key) | read-only API calls |
| `npm run build` | Runs the env check first **only when `VERCEL_ENV=production`**, then `next build`. Local/preview builds need no production secrets | none |
| `npm run smoke:production -- https://dakar-auto.vercel.app` | Non-destructive smoke (defaults to `SMOKE_BASE_URL`, then `NEXT_PUBLIC_APP_URL`) | **1 real OpenAI chat request**; 1 recovery lookup (5/15 min per IP limit) |
| `PART_RECOGNITION_SMOKE=1 npm run smoke:production -- <url>` | Adds one real photo-recognition call with `public/parts/categories/suspension.webp` | **1 paid OpenAI image request** |

Required production variables (checked by the gate): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`,
`OPENAI_CHAT_MODEL`, `OPENAI_PART_RECOGNITION_MODEL`, `REQUEST_RECOVERY_SECRET`
(≥ 32 chars after trimming), `RESEND_API_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
`TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` (public https origin — every
tracking link in customer emails is built from it; unset it falls back to
`http://localhost:3000`).

Warned, not fatal: `RESEND_FROM_EMAIL`. Unset, mail is sent from
`onboarding@resend.dev`, which Resend only delivers to the Resend account
owner's own address — real customers receive nothing.

WhatsApp variables are intentionally not validated yet.

## Where to look when something is "unavailable"

| Symptom | Vercel log line | Meaning |
|---|---|---|
| Recovery says "temporairement indisponible" at start | `[request-recovery] unavailable: configuration invalid {"problems":[…],…}` | Exact failing flag(s): `recovery_secret_missing`, `recovery_secret_too_short`, `resend_api_key_missing`, `resend_client_missing`, `supabase_url_missing`, `service_role_missing` |
| Recovery unavailable after name entered | `[request-recovery] candidate lookup (parts\|vehicle) failed: <pg code> <message>` then `unavailable: action failed lookup recovery_lookup_failed` | Database/schema error on that table |
| "Code could not be sent" | `[email] Recovery code send rejected by Resend: name=… status=… fallbackSender=…` | Resend rejected (e.g. `validation_error`/403 with `fallbackSender=true` → set `RESEND_FROM_EMAIL` on a verified domain) → client sees `delivery_failed` |
| Turnstile form won't submit | `[turnstile] verification failed: category=secret_invalid\|token_expired_or_reused\|token_invalid\|other` | `secret_invalid` = wrong secret / site key and secret from different widgets |
| Turnstile widget error in browser | browser console `[turnstile] script\|render\|widget failed: … (host=… key=0x4AAA…)` | `script` = api.js blocked/unreachable; widget code `110200` = hostname not in the widget's allow-list; `110100/400020` = bad site key |
| Turnstile "unavailable" block | browser console `NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set in this build` | Key missing at **build** time → set it and redeploy |

## Critical feature matrix

Legend: ✅ passed · ❌ failed · ⚠️ passed with a known gap · ⏳ not yet run · 🚫 not production ready

Last run: 2026-09-27 against `https://dakar-auto.vercel.app` (the deployment
live at that time, which **predates** this reliability pass).

| # | Feature | Automated tests | Production smoke | Real E2E (manual) | Status |
|---|---|---|---|---|---|
| 1 | AI chat | `src/services/chat/__tests__/*`, `src/lib/chat/__tests__/chat-lib.test.ts` | ✅ "AI chat — real OpenAI request" + widget `aiEnabled` | Ask a question in the widget on a phone | ⚠️ smoke passes; manual E2E ⏳ |
| 2 | Lost-request recovery | `request-recovery/__tests__/{flow,config,handle-request}.test.ts` | ✅ impossible email → `not_found`; ✅ impossible phone → `not_found` (manual probe); `status` check needs the new deployment | contact + surname of a safe test request → email received → OTP → request number + `/track/<token>` | ❌ **not ready**. Live deployment: every real match returns `unavailable` (jsonb `contains` bug, fixed in code, not deployed). Fixed code run locally against the real DB + real Resend: match ✅ → challenge row ✅ → Resend **rejected** (`validation_error` 403, fallback sender) → `delivery_failed` ✅. OTP arrival and verification not yet proven: needs `RESEND_FROM_EMAIL` on a verified domain |
| 3 | Request tracking | — (lookup logic untested in this pass) | ✅ `/track` renders | Look up a known request number + contact through Turnstile | ⏳ |
| 4 | Turnstile | `turnstile/__tests__/verify.test.ts`, `lib/__tests__/turnstile-errors.test.ts` | ✅ production (non-test) site key inlined in `/track`; ✅ Cloudflare api.js reachable | Solve a real challenge on production and submit a form (server siteverify must accept) | ⚠️ secret + key pairing and hostname allow-list unproven until manual E2E |
| 5 | Part photo recognition | `part-recognition/__tests__/*` | ✅ endpoint configured (no paid call); real call only with `PART_RECOGNITION_SMOKE=1` (⏳) | Upload a real part photo in the wizard | ⏳ |
| 6 | Camera capture | `src/lib/__tests__/photo-camera.test.ts` | — (needs a device) | iOS Safari + Android Chrome: capture a photo in the wizard | ⏳ manual only |
| 7 | Gallery upload | `attachments/__tests__/validation.test.ts` | — | Pick an image from the gallery on a phone | ⏳ manual only |
| 8 | Parts request creation | `requests/__tests__/*` | page `/parts` ✅ (smoke never creates requests) | Submit a real request with Turnstile, confirm it in admin | ⏳ |
| 9 | Vehicle sourcing request creation | `vehicle-requests/__tests__/validate.test.ts` | page `/source-a-vehicle` ✅ | Submit a real request with Turnstile, confirm it in admin | ⏳ (production `vehicle_requests` currently has 0 rows) |
| 10 | Public vehicle inventory | — | ✅ `/vehicles` renders | Check listings/photos match admin | ⚠️ page errors are swallowed to an empty list, so smoke cannot distinguish "empty" from "DB error" |
| 11 | Customer email confirmation | `notifications/__tests__/*` | — | Submit a request with a non-owner email, confirm receipt and that the tracking link opens production | ❌ **not ready**: `RESEND_FROM_EMAIL` and `NEXT_PUBLIC_APP_URL` are not in the Production variable list → sender falls back to `onboarding@resend.dev` and links to `http://localhost:3000` |
| 12 | Preferred contact routing | `notifications/__tests__/*` | — | Submit with each preferred channel, check which channel notifies | ⏳ (WhatsApp branch blocked by #15) |
| 13 | Request-number consistency | `requests/__tests__/request-number.test.ts` | — | Number shown on success screen = email = admin = tracking | ⏳ |
| 14 | Mobile critical flows | partial (camera/photo helpers) | — | Phone: chat, recovery, parts request, tracking, Turnstile | ⏳ manual only |
| 15 | WhatsApp | `whatsapp/__tests__/*` | not checked | real WABA + number + template | 🚫 NOT PRODUCTION READY (setup pending) |

### Recovery — definition of RECOVERY READY

All of these, on production, with a request whose mailbox belongs to Dakar Auto:

1. contact + surname → candidate found
2. `request_recovery_challenges` row created
3. OTP generated and handed to Resend (accepted)
4. OTP email arrives
5. OTP verifies
6. correct request number returned
7. correct `/track/<token>` link returned and opens

Known safe test requests (owner-controlled mailbox, no customer involved):
`DA-2026-000048`, `DA-2026-000037` (parts). No vehicle request exists yet.

### Manual Turnstile production check

1. Open `/track` on the production domain in a normal browser (no blockers).
2. The widget must render and pass; the console must show no `[turnstile]` errors.
3. Submit a lookup. Success (or a normal "not found") proves siteverify accepted
   the token; a `category=secret_invalid` log means the secret does not belong
   to the site key's widget.
4. Repeat on every production hostname (e.g. `dakar-auto.vercel.app` and the
   custom domain once live) — each must be in the widget's Hostname Management.
