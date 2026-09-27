# Part photo recognition (OpenAI)

In the part-request wizard, the category step's "Identify with a photo"
button opens `identify-photo-modal.tsx`. The customer picks or takes a photo,
then presses **Analyze photo**. Picking a photo alone never calls the AI.

## Flow

1. The browser checks the type and size, then POSTs `multipart/form-data` to
   `/api/part-recognition` with:
   - `image`
   - `locale` (`fr`/`en`)
   - optional `year`, `make`, `model`, `engine`

   It never sends the VIN or any contact details. Photos over 3 MB are first
   re-encoded in the browser to a JPEG of at most 2048 px, which keeps
   requests under hosting body limits (4.5 MB on Vercel).
2. The route (`src/services/part-recognition/handle-request.ts`):
   - answers `not_configured` if `OPENAI_API_KEY` is missing;
   - otherwise validates the image again: present, not empty, at most 8 MB,
     and a declared type of JPEG, PNG or WEBP;
   - then sniffs the actual bytes (`attachments/sniff.ts`).
3. `recognize-part.ts` makes a single `openai.responses.create` call:
   - one `input_image` (a base64 data URL, `detail: "auto"`);
   - a strict JSON-schema Structured Output;
   - `store: false`, no tools;
   - a 20 s timeout and no automatic retries.
4. `validate-result.ts` re-checks the output against the catalog before
   anything reaches the browser.
5. The customer sees the localized result. **Use this part** fills in the
   category, subcategory and part name and opens Part Details. A category-only
   match opens the subcategory grid instead.

Nothing is stored: no Supabase row, no Storage upload, and no image bytes or
AI output in logs. The normal request-photo upload in Part Details is a
separate, unchanged flow.

## Environment variables (server-only)

| Variable                        | Required | Default       |
| ------------------------------- | -------- | ------------- |
| `OPENAI_API_KEY`                | yes      | none          |
| `OPENAI_PART_RECOGNITION_MODEL` | no       | `gpt-6-astra` |

Never prefix these with `NEXT_PUBLIC_`, and never commit a real key. Without
`OPENAI_API_KEY`, the modal shows "temporarily unavailable" and the rest of
the site is unaffected. The model must support image input and Structured
Outputs.

## Catalog constraint

- The allowed categories are `PART_CATEGORY_KEYS` plus `other`.
- The subcategory enum is every key in `PART_SUBCATEGORY_KEYS`, plus `null`.
- Both come from `src/lib/parts-catalog.ts` (see
  `src/lib/part-recognition/catalog.ts`), so there is no second list to
  maintain.
- Strict schemas can't tie a subcategory to its category, so application
  code checks that pairing. On a mismatch it keeps the category, drops the
  subcategory and requires confirmation.

## Rate limiting (outstanding)

There is no shared, distributed rate limiter in this project; the existing
limiters are per-instance, in memory. The endpoint therefore relies on:

- a single in-flight request per modal;
- the image size limits;
- the 20 s timeout;
- no automatic retries.

**Before heavy public traffic, add per-IP rate limiting for this endpoint**
(for example Vercel Firewall rules or a Redis/Upstash-backed limiter), and
set a monthly budget limit on the OpenAI project.
