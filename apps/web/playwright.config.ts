import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3210);
const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 3311);

/** Runs against the production build (`pnpm build` first). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  // Every page renders WebGL; in headless (software GL) CI more workers just starve each other.
  workers: 3,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
  ],
  webServer: [
    {
      // Stateful stand-in for Fourthwall's Storefront API: tests never touch the live API.
      command: "node e2e/fourthwall-mock/server.mjs",
      url: `http://127.0.0.1:${MOCK_PORT}/__health`,
      env: { E2E_MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm exec next start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      // Merch config is read at request time, so the same build points at the mock here.
      env: {
        FOURTHWALL_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
        FOURTHWALL_STOREFRONT_TOKEN: "e2e-token",
        FOURTHWALL_COLLECTION_SLUG: "all",
        NEXT_PUBLIC_FOURTHWALL_SHOP_DOMAIN: "shop.example.com",
      },
      // Never reuse a server started without the mock env.
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
