import { tmpdir } from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  // Cold dev-server compiles of API routes can take several seconds.
  expect: { timeout: 30_000 },
  workers: 1,
  // Outside the project: the dev server watches the project dir, and trace writes there trigger rebuilds mid-test.
  outputDir: path.join(tmpdir(), 'ghid-pw-results'),
  reporter: 'list',
  use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 120_000,
    // Playwright sets NODE_ENV=test, which breaks next dev.
    env: { REPO: 'memory', AI_PROVIDER: 'fake', NODE_ENV: 'development' },
  },
});
