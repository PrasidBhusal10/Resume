/**
 * export.spec.ts — Download flow for PDF, DOCX, and LaTeX.
 *
 * The export endpoints trigger file downloads; Playwright intercepts
 * them so we can assert the response content-type and filename
 * without actually writing to disk.
 */

import { test, expect, type Page } from "@playwright/test";

// ── Mocks ─────────────────────────────────────────────────────────────────────

function mockExportEndpoints(page: Page) {
  // Mock POST /api/export/:id/pdf → returns an exportId
  for (const fmt of ["pdf", "docx", "tex"]) {
    page.route(`**/api/export/**/${fmt}`, async (route) => {
      await route.fulfill({
        status:      200,
        contentType: "application/json",
        body: JSON.stringify({ exportId: 99, downloadUrl: `/api/export/99/download`, size: 12_345 }),
      });
    });
  }

  // Mock GET /api/export/:id/download → return fake binary
  page.route("**/api/export/99/download", async (route) => {
    await route.fulfill({
      status:      200,
      contentType: "application/pdf",
      body:        "%PDF-1.4 fake content",
      headers: {
        "Content-Disposition": 'attachment; filename="resume.pdf"',
      },
    });
  });
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function openEditor(page: Page) {
  mockExportEndpoints(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /blank resume/i }).click();
  await page.waitForURL(/\/editor\/\d+/, { timeout: 15_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Export panel", () => {
  test("dropdown shows three format options", async ({ page }) => {
    await openEditor(page);

    await page.getByRole("button", { name: /export/i }).click();

    await expect(page.getByText("PDF")).toBeVisible();
    await expect(page.getByText("DOCX")).toBeVisible();
    await expect(page.getByText("LaTeX")).toBeVisible();
  });

  test("dropdown closes when clicking backdrop", async ({ page }) => {
    await openEditor(page);

    await page.getByRole("button", { name: /export/i }).click();
    await expect(page.getByText("PDF")).toBeVisible();

    // Click somewhere outside
    await page.mouse.click(10, 10);
    await expect(page.getByText("PDF")).not.toBeVisible({ timeout: 3_000 });
  });

  test("PDF download triggers with correct toast", async ({ page }) => {
    await openEditor(page);

    // Listen for download event
    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: /export/i }).click();
    await page.getByText("PDF").click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/resume\.pdf/i);

    await expect(page.getByText(/downloaded as pdf/i)).toBeVisible({ timeout: 8_000 });
  });

  test("DOCX download shows correct toast", async ({ page }) => {
    // Override the download mock for DOCX
    await page.route("**/api/export/99/download", async (route) => {
      await route.fulfill({
        status:      200,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        body:        "PK fake docx content",
        headers: {
          "Content-Disposition": 'attachment; filename="resume.docx"',
        },
      });
    });

    await openEditor(page);

    await page.getByRole("button", { name: /export/i }).click();
    // Override pdf mock to return DOCX
    await page.route("**/api/export/**/docx", async (route) => {
      await route.fulfill({
        status:      200,
        contentType: "application/json",
        body: JSON.stringify({ exportId: 99, downloadUrl: `/api/export/99/download`, size: 8_000 }),
      });
    });

    await page.getByText("DOCX").click();
    await expect(page.getByText(/downloaded as docx/i)).toBeVisible({ timeout: 8_000 });
  });

  test("shows file size in toast message", async ({ page }) => {
    await openEditor(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /export/i }).click();
    await page.getByText("PDF").click();
    await downloadPromise;
    // 12345 bytes = 12.1 KB
    await expect(page.getByText(/12\.\d KB/)).toBeVisible({ timeout: 5_000 });
  });

  test("shows spinner while export is generating", async ({ page }) => {
    // Slow down the export API
    await page.route("**/api/export/**/pdf", async (route) => {
      await new Promise((r) => setTimeout(r, 1_500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ exportId: 99, downloadUrl: `/api/export/99/download`, size: 1 }),
      });
    });

    mockExportEndpoints(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /blank resume/i }).click();
    await page.waitForURL(/\/editor\/\d+/);

    await page.getByRole("button", { name: /export/i }).click();
    await page.getByText("PDF").click();

    // Spinner should be visible during the delay
    await expect(page.locator(".animate-spin")).toBeVisible();
  });
});
