import 'server-only'

const MAX_FILENAME_LENGTH = 120

// Original filenames are stored only as display metadata (never used to
// build a storage path), so this only needs to strip anything unsafe to
// render or store as text — control characters and path separators fall
// through the allowlist below and become underscores.
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'photo'
  const cleaned = base
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .trim()

  return cleaned.slice(0, MAX_FILENAME_LENGTH) || 'photo'
}
