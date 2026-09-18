import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      // upload-token.ts reads this at module load time — a fixed test
      // value is fine since these tests never talk to the real deployment.
      ATTACHMENT_UPLOAD_TOKEN_SECRET: 'test-secret-do-not-use-in-production',
    },
  },
  resolve: {
    alias: {
      // See src/test/server-only-stub.ts for why this alias exists.
      'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts'),
      '@': path.resolve(__dirname, '.'),
    },
  },
})
