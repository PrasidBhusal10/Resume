/**
 * auth.spec.ts — Registration, login, and logout flows.
 *
 * These run in a fresh context (no stored auth state) so they
 * can test the full unauthenticated experience.
 */

import { test, expect } from "@playwright/test";
import { TEST_USER, SEEDED_USER } from "../fixtures/test-data";

// Override the project's stored auth state for these tests
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Registration", () => {
  test("shows landing page to unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/resumeai/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
  });

  test("redirects /dashboard to /auth/login when not logged in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/auth\/login/);
  });

  test("registers a new account successfully", async ({ page }) => {
    await page.goto("/auth/register");

    await page.getByLabel(/full name/i).fill(TEST_USER.name);
    await page.getByLabel(/email/i).fill(TEST_USER.email);
    await page.getByLabel(/password/i).fill(TEST_USER.password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to login with success toast
    await expect(page).toHaveURL(/auth\/login/);
    await expect(page.getByText(/account created/i)).toBeVisible({ timeout: 8_000 });
  });

  test("shows error for duplicate email", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByLabel(/full name/i).fill("Dup User");
    await page.getByLabel(/email/i).fill(SEEDED_USER.email); // already registered
    await page.getByLabel(/password/i).fill("SomePass99!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 8_000 });
  });

  test("enforces minimum password length", async ({ page }) => {
    await page.goto("/auth/register");
    await page.getByLabel(/email/i).fill("short@test.com");
    await page.getByLabel(/password/i).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/8 characters/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Login", () => {
  test("logs in with valid credentials", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(SEEDED_USER.email);
    await page.getByLabel(/password/i).fill(SEEDED_USER.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page.getByText(/my resumes/i)).toBeVisible();
  });

  test("shows error for wrong password", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(SEEDED_USER.email);
    await page.getByLabel(/password/i).fill("WrongPassword!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 8_000 });
  });

  test("password toggle shows/hides text", async ({ page }) => {
    await page.goto("/auth/login");
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill("MySecret99!");

    // Default is hidden
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle to reveal
    await page.getByRole("button", { name: /show/i }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });
});

test.describe("Logout", () => {
  test.use({
    // Restore auth for logout test
    storageState: "playwright/.auth/user.json",
  });

  test("logs out and redirects to landing page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/");
    // After logout, dashboard should redirect to login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/auth\/login/);
  });
});
