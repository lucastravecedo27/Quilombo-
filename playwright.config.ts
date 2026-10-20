import { defineConfig, devices } from '@playwright/test';

// Pruebas sobre la build de demo (VITE_E2E=1): sin servidor, con datos sembrados en IndexedDB (src/lib/app/demo.ts)
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4174', locale: 'es-CO', timezoneId: 'America/Bogota' },
  webServer: { command: 'VITE_E2E=1 npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4174 --strictPort', port: 4174, reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'iphone-claro', use: { ...devices['iPhone 15 Pro'], colorScheme: 'light' } },
    { name: 'iphone-oscuro', use: { ...devices['iPhone 15 Pro'], colorScheme: 'dark' } }
  ]
});
