import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // 只在 tests/s2 找 .env*（該目錄沒有任何 .env 檔），避免載入專案根目錄的本機設定與秘密
  envDir: fileURLToPath(new URL('./tests/s2', import.meta.url)),
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/s2/setup.ts'],
  },
})
