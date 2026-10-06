import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const adminStatePath = join(tmpdir(), "pouch-playwright-admin-state.json");
const databasePath = join(tmpdir(), "pouch-playwright-quotations.db");
const publicLeadDatabasePath = join(
  tmpdir(),
  `pouch-public-lab-g008-${process.pid}-${Date.now()}.db`,
);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
    },
    {
      name: "chromium",
      testIgnore: [/auth\.setup\.ts/, /public-lab\.spec\.ts/],
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: adminStatePath },
    },
    {
      name: "mobile-chrome",
      testIgnore: [/auth\.setup\.ts/, /public-lab\.spec\.ts/],
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], storageState: adminStatePath },
    },
    {
      name: "public-anonymous",
      testMatch: /public-lab\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "public-anonymous-mobile",
      testMatch: /public-lab\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 7"],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  webServer: {
    command: [
      `rm -f ${databasePath} ${databasePath}-shm ${databasePath}-wal`,
      `rm -f ${publicLeadDatabasePath} ${publicLeadDatabasePath}-shm ${publicLeadDatabasePath}-wal`,
      [
        `POUCH_QUOTATION_DB=${JSON.stringify(databasePath)}`,
        `POUCH_PUBLIC_LEAD_DB=${JSON.stringify(publicLeadDatabasePath)}`,
        "ADMIN_EMAIL=admin@pouch-e2e.test",
        "ADMIN_PASSWORD=admin-e2e-password",
        "ADMIN_NAME='E2E Administrator'",
        "npm run dev -- -H 127.0.0.1 -p 3100",
      ].join(" "),
    ].join("; "),
    url: "http://127.0.0.1:3100",
    reuseExistingServer: process.env.CI !== "true",
    timeout: 60000,
  },
});
