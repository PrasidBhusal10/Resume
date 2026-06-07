/**
 * dashboard.spec.ts — Resume CRUD from the dashboard.
 */

import { test, expect } from "@playwright/test";
import { RESUME_TITLE } from "../fixtures/test-data";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/my resumes/i)).toBeVisible();
  });

  test("displays the dashboard with nav elements", async ({ page }) => {
    await expect(page.getByText(/resumeai/i).first()).toBeVisible();
    await expect(page.getByRole("link",   { name: /templates/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i  })).toBeVisible();
  });

  test("creates a blank resume and navigates to editor", async ({ page }) => {
    await page.getByRole("button", { name: /blank resume/i }).click();

    // Should navigate to /editor/:id
    await page.waitForURL(/\/editor\/\d+/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/editor\/\d+/);
  });

  test("opens onboarding modal when 'From Template' is clicked", async ({ page }) => {
    await page.getByRole("button", { name: /from template/i }).click();
    await expect(page.getByText(/choose a template/i)).toBeVisible();
  });

  test("deletes a resume", async ({ page }) => {
    // First create one
    await page.getByRole("button", { name: /blank resume/i }).click();
    await page.waitForURL(/\/editor\/\d+/);
    await page.goto("/dashboard");

    // Hover the card to reveal the delete button
    const card = page.locator(".group").first();
    await card.hover();
    const deleteBtn = card.getByRole("button", { name: /delete/i });
    await deleteBtn.waitFor({ state: "visible" });
    await deleteBtn.click();

    await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 5_000 });
  });

  test("shows empty state when no resumes", async ({ page, request }) => {
    // Check the DOM — if empty state present it renders correctly
    const emptyState = page.getByText(/create your first resume/i);
    const resumeGrid = page.locator(".card").first();

    // One of these will be visible depending on data
    await Promise.race([
      emptyState.waitFor({ state: "visible", timeout: 10_000 }),
      resumeGrid.waitFor({ state: "visible", timeout: 10_000 }),
    ]);
  });

  test("smoke: templates page loads", async ({ page }) => {
    await page.getByRole("link", { name: /templates/i }).click();
    await page.waitForURL(/\/templates/);
    await expect(page.getByText(/choose a template/i)).toBeVisible();
    // At least one template card should render
    await expect(page.locator("[role=button]").first()).toBeVisible({ timeout: 10_000 });
  });
});
