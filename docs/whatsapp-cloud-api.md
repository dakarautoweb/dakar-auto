# Customer notifications and WhatsApp Cloud API

## How a request is notified

Parts requests and vehicle sourcing requests follow the same rules. After the
request is saved, the submit action (`submitPartsRequestAction` or
`submitVehicleRequestAction`) calls its notification router
(`sendPartsRequestNotifications` or `sendVehicleRequestNotifications`) inside
`after()`, which runs once the response has been sent. The router makes the
deliveries below at the same time:

| Customer's preferred contact | Customer confirmation         | Admin email |
| ---------------------------- | ----------------------------- | ----------- |
| `whatsapp`                   | WhatsApp template (no email)  | yes         |
| `email`                      | Confirmation email (no WhatsApp) | yes      |
| `phone`                      | none: the team calls them     | yes         |

- **No fallback between channels.** If the WhatsApp send fails, the customer
  does not get an email instead. An email address typed in by a customer who
  chose WhatsApp stays on the request, but no confirmation email is sent to it.
- **Deliveries are independent and best-effort.** A failed or misconfigured
  WhatsApp or email send is logged on the server. It never changes the
  customer's success response and never rolls back the request. The
  `parts_requests` / `vehicle_requests` row is the source of truth.
- **The admin email always shows** the preferred contact method, whether an
  automatic confirmation went out ("Confirmation client"), and the customer's
  phone, WhatsApp number and email.
- **Server validation matches the channel**, for both request types:
  WhatsApp needs a valid international WhatsApp number, email needs a valid
  email address, and a phone number is always required.

Code:

- `src/services/notifications/send-parts-request-notifications.ts` and
  `send-vehicle-request-notifications.ts`: the routers.
- `src/services/email/send-parts-request-emails.ts` and
  `send-vehicle-request-emails.ts`: send the admin email and the customer
  email.
- `src/services/whatsapp/`: config, phone normalization, the template sender,
  and the parts-request and vehicle-request confirmations.

## Environment variables (server-only)

Set these in the hosting provider (e.g. Vercel → Project → Settings →
Environment Variables) or in your local `.env.local`. Never commit real values,
and never prefix them with `NEXT_PUBLIC_`.

| Variable                        | Example                     | Notes |
| ------------------------------- | --------------------------- | ----- |
| `WHATSAPP_CLOUD_API_TOKEN`      | *(secret)*                  | Permanent System User access token with `whatsapp_business_messaging` permission. |
| `WHATSAPP_PHONE_NUMBER_ID`      | `123456789012345`           | The **Phone number ID** (not the phone number itself), from WhatsApp → API Setup. |
| `WHATSAPP_GRAPH_API_VERSION`    | `v23.0`                     | Optional. Defaults to `v23.0`. |
| `WHATSAPP_TEMPLATE_NAME_FR`     | `dakar_request_received_fr` | Approved French template name. |
| `WHATSAPP_TEMPLATE_LANGUAGE_FR` | `fr`                        | Must exactly match the language code the template was approved under. |
| `WHATSAPP_TEMPLATE_NAME_EN`     | `dakar_request_received_en` | Approved English template name. |
| `WHATSAPP_TEMPLATE_LANGUAGE_EN` | `en` or `en_US`             | Must exactly match the approved template's language code. |
| `WHATSAPP_VEHICLE_TEMPLATE_NAME_FR`     | `dakar_vehicle_request_received_fr` | Approved French template name for **vehicle sourcing** requests. |
| `WHATSAPP_VEHICLE_TEMPLATE_LANGUAGE_FR` | `fr`                                | Must exactly match that template's approved language code. |
| `WHATSAPP_VEHICLE_TEMPLATE_NAME_EN`     | `dakar_vehicle_request_received_en` | Approved English template name for vehicle sourcing requests. |
| `WHATSAPP_VEHICLE_TEMPLATE_LANGUAGE_EN` | `en` or `en_US`                     | Must exactly match that template's approved language code. |
| `WHATSAPP_STATUS_TEMPLATE_NAME_FR` | *(configure after approval)* | Generic French status-update template. |
| `WHATSAPP_STATUS_TEMPLATE_LANGUAGE_FR` | *(configure after approval)* | Exact approved French language code. |
| `WHATSAPP_STATUS_TEMPLATE_NAME_EN` | *(configure after approval)* | Generic English status-update template. |
| `WHATSAPP_STATUS_TEMPLATE_LANGUAGE_EN` | *(configure after approval)* | Exact approved English language code. |
| `WHATSAPP_VEHICLE_FOUND_TEMPLATE_NAME_FR` | `dakar_vehicle_found_photo_fr` | French vehicle-found template with IMAGE header. |
| `WHATSAPP_VEHICLE_FOUND_TEMPLATE_LANGUAGE_FR` | *(approved language code)* | Must exactly match Meta approval. |
| `WHATSAPP_VEHICLE_FOUND_TEMPLATE_NAME_EN` | `dakar_vehicle_found_photo_en` | English vehicle-found template with IMAGE header. |
| `WHATSAPP_VEHICLE_FOUND_TEMPLATE_LANGUAGE_EN` | *(approved language code)* | Must exactly match Meta approval. |

The `WHATSAPP_TEMPLATE_*` variables are used for parts requests and the
`WHATSAPP_VEHICLE_TEMPLATE_*` variables for vehicle requests. The token and
phone number ID are shared. If a variable a request type needs is missing,
WhatsApp sending is disabled for that request type only. Each request then logs
a one-line message naming the missing variables (names only, never values), and
everything else keeps working.

Existing email variables, unchanged: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
`DAKAR_ADMIN_EMAIL`.

## Meta setup (manual, one-time)

1. In Meta Business Manager, create or choose a **WhatsApp Business Account**
   and add and verify the business phone number that will send the messages.
2. Create a **System User** with admin access to the app and the WhatsApp
   account, then generate a **permanent token** with the
   `whatsapp_business_messaging` and `whatsapp_business_management`
   permissions. Temporary 24-hour tokens from the API Setup page expire and
   are only suitable for testing.
3. Create eight message templates, category **Utility**: initial parts,
   initial vehicle sourcing, generic status update, and vehicle found, each
   in French and English. Wait for Meta to approve them. **Sending fails (HTTP 4xx) until each
   template is approved** under exactly the name and language set in the
   environment variables.
4. Add a payment method to the WhatsApp Business Account. Business-initiated
   template messages are billed by Meta.
5. While the app is in development mode, Meta only delivers to recipient
   numbers added to the test-number allow list.

### Template body: parameter order

The code sends four positional **body** parameters (`{{1}}`…`{{4}}`), in this
order:

1. customer name
2. request number: the final stored value, e.g. `DA-2026-000123`
3. vehicle summary: `year make model`, e.g. `2018 Toyota Corolla`
4. tracking URL: `https://<site>/track/<token>`

Suggested wording to submit for approval (the approved template holds the text,
and the code never sends free-form text):

**FR** (`fr`)

```
Bonjour {{1}},
votre demande Dakar Auto {{2}} a bien été reçue.

Véhicule : {{3}}

Vous pouvez suivre son avancement ici :
{{4}}
```

**EN** (`en`)

```
Hello {{1}},
your Dakar Auto request {{2}} has been received.

Vehicle: {{3}}

Track its progress here:
{{4}}
```

Meta asks for sample values for each variable when you submit a template. Use
realistic samples such as `Awa`, `DA-2026-000123`, `2018 Toyota Corolla` and
`https://dakarauto.com/track/…`.

### Vehicle sourcing template: parameter order

The vehicle template also takes four positional **body** parameters, in this
order:

1. customer name
2. request number: the final stored value, e.g. `VR-2026-000123`
3. wanted vehicle summary: `make model years`, e.g. `Toyota RAV4 2018–2021`
   (years show as `2018–2021`, `2018`, `2018+` or `≤ 2021`, and are omitted if
   none were given; an empty summary is sent as `—`)
4. tracking URL: `https://<site>/track/<token>`

Suggested wording:

**FR** (`fr`)

```
Bonjour {{1}},
votre demande de recherche de véhicule Dakar Auto {{2}} a bien été reçue.

Véhicule recherché : {{3}}

Vous pouvez suivre son avancement ici :
{{4}}
```

**EN** (`en`)

```
Hello {{1}},
your Dakar Auto vehicle sourcing request {{2}} has been received.

Vehicle wanted: {{3}}

Track its progress here:
{{4}}
```

Samples: `Awa`, `VR-2026-000123`, `Toyota RAV4 2018–2021`,
`https://dakarauto.com/track/…`.

## Generic status-update template

The same FR/EN Utility template is used for every ordinary parts or vehicle
sourcing status. The code supplies five positional **body** parameters:

1. `{{1}}` customer name
2. `{{2}}` request number
3. `{{3}}` localized status label
4. `{{4}}` localized short status message
5. `{{5}}` absolute tracking URL

Suggested exact French copy:

```text
Bonjour {{1}},

le statut de votre demande Dakar Auto {{2}} a été mis à jour.

Nouveau statut : {{3}}
{{4}}

Suivez votre demande :
{{5}}

Merci,
L’équipe Dakar Auto
```

Suggested exact English copy:

```text
Hello {{1}},

the status of your Dakar Auto request {{2}} has been updated.

New status: {{3}}
{{4}}

Track your request:
{{5}}

Thank you,
The Dakar Auto Team
```

The actual names and language codes are deliberately not hardcoded. Configure
the four `WHATSAPP_STATUS_TEMPLATE_*` variables only after Meta approval.

## Vehicle-found photo template

`vehicle_found` uses the dedicated `dakar_vehicle_found_photo_fr` /
`dakar_vehicle_found_photo_en` templates (their names are still supplied
through env). Components and parameter namespaces are:

- Header: one `IMAGE` parameter. The sender uses the actual found vehicle
  photo when available. Otherwise it uses the absolute URL for
  `public/brand/dakar-auto-logo.png`, built from `NEXT_PUBLIC_APP_URL`.
- Body `{{1}}`: customer name.
- Body `{{2}}`: found vehicle make + model.
- Body `{{3}}`: found vehicle year.
- Body `{{4}}`: formatted price + currency, or localized price on request.
- URL button `{{1}}`: tracking-token suffix only. This is a separate
  component namespace from body `{{1}}`; Meta combines it with
  `https://dakarautoweb.com/track/{{1}}`.

Suggested exact French body:

```text
Bonjour {{1}},

nous avons trouvé un véhicule correspondant à votre demande Dakar Auto.

Véhicule : {{2}}
Année : {{3}}
Prix : {{4}}

Vous pouvez consulter les détails de votre demande ci-dessous.

Merci,
L’équipe Dakar Auto
```

Suggested exact English body:

```text
Hello {{1}},

we found a vehicle matching your Dakar Auto request.

Vehicle: {{2}}
Year: {{3}}
Price: {{4}}

You can view your request details below.

Thank you,
The Dakar Auto Team
```

Inventory and manual match photos are persisted as durable bucket/path
references. For a private bucket, the sender creates a short-lived signed URL
at send time; an expiring signed URL is never stored.

## Status-change routing

Status notifications use the same strict channel contract as initial
confirmation: `whatsapp` sends WhatsApp only, `email` sends email only, and
`phone` sends nothing automatically. There is no cross-channel fallback.
Database status/history changes finish before best-effort delivery is queued
with `after()`, so delivery failure never rolls back saved state.

## Recipient numbers

The WhatsApp number (the phone number when "same as phone" is ticked,
otherwise the separate WhatsApp field) must be in international format.
`src/services/whatsapp/phone.ts` strips the formatting and sends digits only,
e.g. `+221 77 123 45 67` → `221771234567`. A country code is never guessed:
local numbers such as `77 123 45 67` are rejected by the contact form and by
server validation when the customer chooses WhatsApp.

## Security

- The token is only read on the server, at send time. It is never stored in
  Supabase, sent to the browser, or logged.
- Logs contain only short messages such as
  `[whatsapp] Customer confirmation failed for DA-2026-000123: Meta API returned 400`.
  Meta's response bodies and request headers are never logged.
