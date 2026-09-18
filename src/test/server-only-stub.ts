// Vitest-only stub for the bare `import 'server-only'` guard used across
// src/services/**. The real `server-only` package only resolves inside
// Next.js's own bundler (it ships as next/dist/compiled/server-only, not as
// a standalone node_modules package) — this alias (see vitest.config.ts)
// lets the same source files run unmodified under plain Node/Vitest.
export {}
