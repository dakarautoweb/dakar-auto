import 'server-only'

// Documented env var names for the future PartsTech / Nexpart integration.
// None of these are set anywhere in this codebase — they're read-only
// lookups so a provider can report its own configured/not-configured
// state; nothing here makes a network call or assumes an auth scheme
// beyond "an API key plus a base URL and account id", which is the most
// common shape and easy to change once real docs exist.
//
// PartsTech:
//   PARTSTECH_API_KEY
//   PARTSTECH_API_BASE_URL
//   PARTSTECH_ACCOUNT_ID
//
// Nexpart:
//   NEXPART_API_KEY
//   NEXPART_API_BASE_URL
//   NEXPART_ACCOUNT_ID
//
// Nexpart's real auth pattern isn't documented to us yet and may turn out
// to be username/password rather than a bearer API key — see
// NexpartCredentials below, kept as its own type for exactly that reason.

function readEnv(name: string): string | null {
  return process.env[name]?.trim() || null
}

export type PartsTechCredentials = {
  apiKey: string | null
  baseUrl: string | null
  accountId: string | null
}

export function getPartsTechCredentials(): PartsTechCredentials {
  return {
    apiKey: readEnv('PARTSTECH_API_KEY'),
    baseUrl: readEnv('PARTSTECH_API_BASE_URL'),
    accountId: readEnv('PARTSTECH_ACCOUNT_ID'),
  }
}

export function isPartsTechConfigured(): boolean {
  const creds = getPartsTechCredentials()
  return Boolean(creds.apiKey && creds.baseUrl && creds.accountId)
}

// Deliberately a separate type from PartsTechCredentials — if Nexpart turns
// out to need username/password or another auth pattern once documented,
// only this type and getNexpartCredentials() change.
export type NexpartCredentials = {
  apiKey: string | null
  baseUrl: string | null
  accountId: string | null
}

export function getNexpartCredentials(): NexpartCredentials {
  return {
    apiKey: readEnv('NEXPART_API_KEY'),
    baseUrl: readEnv('NEXPART_API_BASE_URL'),
    accountId: readEnv('NEXPART_ACCOUNT_ID'),
  }
}

export function isNexpartConfigured(): boolean {
  const creds = getNexpartCredentials()
  return Boolean(creds.apiKey && creds.baseUrl && creds.accountId)
}
