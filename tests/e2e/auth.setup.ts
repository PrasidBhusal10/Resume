/**
 * auth.setup.ts
 *
 * Runs once before all test suites.
 * Registers the seeded test account (idempotent — ignores 409),
 * logs in, and saves the auth state to disk so all other tests
 * start already authenticated without repeating the login flow.
 */

import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { SEEDED_USER } from "../fixtures/test-data";

const AUTH_FILE = path.join(__dirname, "../../playwright/.auth/user.json");

setup("authenticate once for all tests", async ({ page, request }) => {
  // Ensure the auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // Register the seeded account (ignore conflict if already exists)
  const registerRes = await request.post("/api/auth/register", {
    data: {
      name:     "Playwright Bot",
      email:    SEEDED_USER.email,
      password: SEEDED_USER.password,
    },
  });
  // 201 = created, 409 = already exists — both are acceptable
  expect([201, 200, 409]).toContain(registerRes.status());

  // Navigate to login and authenticate via the UI
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).fill(SEEDED_USER.email);
  await page.getByLabel(/password/i).fill(SEEDED_USER.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait until we land on the dashboard
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page.getByText(/my resumes/i)).toBeVisible();

  // Persist cookies + localStorage so other tests inherit this session
  await page.context().storageState({ path: AUTH_FILE });
});
