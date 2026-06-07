/**
 * editor.spec.ts — Resume editor: sections, saving, live preview.
 */

import { test, expect, type Page } from "@playwright/test";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createAndOpenResume(page: Page): Promise<string> {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /blank resume/i }).click();
  await page.waitForURL(/\/editor\/\d+/, { timeout: 15_000 });
  return page.url();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Editor layout", () => {
  test("renders all three panels", async ({ page }) => {
    await createAndOpenResume(page);

    // Left panel: section editor
    await expect(page.getByRole("complementary", { name: /section editor/i })).toBeVisible();
    // Center: preview
    await expect(page.getByRole("main", { name: /resume preview/i })).toBeVisible();
    // Right: AI optimizer
    await expect(page.getByRole("complementary", { name: /ai.*optimizer/i })).toBeVisible();
  });

  test("shows back arrow that navigates to dashboard", async ({ page }) => {
    await createAndOpenResume(page);
    await page.getByRole("link", { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("export button is visible in header", async ({ page }) => {
    await createAndOpenResume(page);
    await expect(page.getByRole("button", { name: /export/i })).toBeVisible();
  });
});

test.describe("Section editing", () => {
  test.beforeEach(async ({ page }) => {
    await createAndOpenResume(page);
  });

  test("expands summary section and saves text", async ({ page }) => {
    // Click Summary in the left panel
    await page.getByText(/professional summary/i).click();

    const textarea = page.getByPlaceholder(/write your professional summary/i);
    await expect(textarea).toBeVisible();

    await textarea.fill("Experienced software engineer with 8 years in distributed systems.");
    await page.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 8_000 });

    // Confirm it appears in the center preview
    await expect(
      page.getByText(/experienced software engineer/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("adds an experience entry", async ({ page }) => {
    await page.getByText(/work experience/i).click();

    await page.getByRole("button", { name: /add position/i }).click();

    // Fill in the first inputs for role and company
    const inputs = page.getByPlaceholder(/job title/i);
    await inputs.first().fill("Senior Engineer");
    await page.getByPlaceholder(/company/i).first().fill("Acme Corp");
    await page.getByPlaceholder(/start/i).first().fill("Jan 2022");
    await page.getByPlaceholder(/end/i).first().fill("Present");

    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 8_000 });

    // Preview should show the new entry
    await expect(page.getByText(/senior engineer/i)).toBeVisible();
    await expect(page.getByText(/acme corp/i)).toBeVisible();
  });

  test("adds a skill category", async ({ page }) => {
    await page.getByText(/^skills$/i).click();

    await page.getByRole("button", { name: /add category/i }).click();

    await page.getByPlaceholder(/category name/i).first().fill("Languages");
    await page.getByPlaceholder(/comma-separated/i).first().fill("Python, Go, C++");

    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 8_000 });

    await expect(page.getByText(/python/i)).toBeVisible();
  });

  test("toggling section visibility hides it from preview", async ({ page }) => {
    // Hover over Education to reveal the eye icon
    await page.getByText(/education/i).hover();
    const eyeBtn = page.getByTitle(/hide section/i);
    await eyeBtn.waitFor({ state: "visible" });
    await eyeBtn.click();

    // The preview should no longer show the Education heading
    await expect(
      page.getByRole("main").getByText(/education/i)
    ).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Export panel", () => {
  test("opens export dropdown with three format options", async ({ page }) => {
    await createAndOpenResume(page);
    await page.getByRole("button", { name: /export/i }).click();

    await expect(page.getByText(/pdf/i)).toBeVisible();
    await expect(page.getByText(/docx/i)).toBeVisible();
    await expect(page.getByText(/latex/i)).toBeVisible();
  });
});
