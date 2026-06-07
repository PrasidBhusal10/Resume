/**
 * jd-optimizer.spec.ts — JD paste → AI optimize → accept/reject flow.
 *
 * These tests mock the AI service at the network layer so they run
 * fast and deterministically without a real Claude API key.
 */

import { test, expect, type Page } from "@playwright/test";
import { SAMPLE_JD } from "../fixtures/test-data";

// ── Mock API responses ────────────────────────────────────────────────────────

const MOCK_ANALYZE_RESPONSE = {
  jdId: 42,
  extracted: {
    required_skills:  ["Go", "Python", "Kubernetes", "Docker", "PostgreSQL"],
    nice_to_have:     ["Rust", "Kafka"],
    keywords:         ["distributed systems", "microservices", "CI/CD", "gRPC"],
    ats_keywords:     ["Go", "Python", "Kubernetes", "Docker", "PostgreSQL", "REST API"],
    seniority:        "senior",
    industry:         "technology",
    responsibilities: ["Design backend services", "Maintain data platform"],
    summary:          "Senior Software Engineer for infrastructure team",
  },
};

const MOCK_OPTIMIZE_RESPONSE = {
  suggestions: [
    {
      section_type: "skills",
      original:     { categories: [] },
      suggested:    {
        categories: [
          { name: "Languages", items: ["Go", "Python", "C++"] },
          { name: "Infrastructure", items: ["Kubernetes", "Docker", "CI/CD"] },
        ],
      },
      diff_summary: "Added Go and Kubernetes to align with JD requirements",
      ats_before:   42,
      ats_after:    87,
      changes:      ["Added Go", "Added Kubernetes", "Reordered skills by JD priority"],
    },
  ],
  overall_score: 87,
  score_message: "ATS match improved from 42% to 87%. Excellent match!",
};

// ── Helper ────────────────────────────────────────────────────────────────────

async function openEditorWithMocks(page: Page) {
  // Intercept C++ backend calls that proxy to the AI service
  await page.route("**/api/jd/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ANALYZE_RESPONSE),
    });
  });

  await page.route("**/api/optimize/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_OPTIMIZE_RESPONSE),
    });
  });

  await page.route("**/api/optimize/*/accept", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Changes applied to resume" }),
    });
  });

  await page.route("**/api/optimize/*/reject", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Suggestion rejected" }),
    });
  });

  // Create a fresh resume and open it
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /blank resume/i }).click();
  await page.waitForURL(/\/editor\/\d+/, { timeout: 15_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("JD Analyzer panel", () => {
  test("renders the AI optimizer panel", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /blank resume/i }).click();
    await page.waitForURL(/\/editor\/\d+/);

    await expect(page.getByText(/ai optimizer/i)).toBeVisible();
    await expect(page.getByPlaceholder(/paste the full job description/i)).toBeVisible();
  });

  test("disables analyze button until 50+ characters are typed", async ({ page }) => {
    await openEditorWithMocks(page);

    const analyzeBtn = page.getByRole("button", { name: /analyze job description/i });
    await expect(analyzeBtn).toBeDisabled();

    await page.getByPlaceholder(/paste the full job description/i).fill("too short");
    await expect(analyzeBtn).toBeDisabled();

    await page.getByPlaceholder(/paste the full job description/i).fill(SAMPLE_JD);
    await expect(analyzeBtn).not.toBeDisabled();
  });

  test("analyzes JD and shows extracted skills", async ({ page }) => {
    await openEditorWithMocks(page);

    await page.getByPlaceholder(/company/i).fill("Acme Corp");
    await page.getByPlaceholder(/job title/i).fill("Senior Software Engineer");
    await page.getByPlaceholder(/paste the full job description/i).fill(SAMPLE_JD);
    await page.getByRole("button", { name: /analyze job description/i }).click();

    // Should show the extracted skills from our mock response
    await expect(page.getByText(/kubernetes/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/senior/i)).toBeVisible();

    // Section checkboxes should appear
    await expect(page.getByText(/professional summary/i)).toBeVisible();
    await expect(page.getByText(/work experience/i)).toBeVisible();
    await expect(page.getByText(/skills/i)).toBeVisible();
  });

  test("runs optimization for selected sections", async ({ page }) => {
    await openEditorWithMocks(page);

    await page.getByPlaceholder(/paste the full job description/i).fill(SAMPLE_JD);
    await page.getByRole("button", { name: /analyze job description/i }).click();
    await page.waitForSelector("text=Kubernetes", { timeout: 10_000 });

    // Deselect all except Skills
    await page.getByLabel(/work experience/i).uncheck();
    await page.getByLabel(/professional summary/i).uncheck();

    await page.getByRole("button", { name: /optimize 1 section/i }).click();

    // Should show results panel
    await expect(page.getByText(/ats match improved/i)).toBeVisible({ timeout: 15_000 });
  });

  test("ATS score shows before → after improvement", async ({ page }) => {
    await openEditorWithMocks(page);

    await page.getByPlaceholder(/paste the full job description/i).fill(SAMPLE_JD);
    await page.getByRole("button", { name: /analyze job description/i }).click();
    await page.waitForSelector("text=Kubernetes");

    await page.getByRole("button", { name: /optimize/i }).click();
    await page.waitForSelector("text=ATS match improved");

    // Scores from mock: 42% → 87%
    await expect(page.getByText(/42%/)).toBeVisible();
    await expect(page.getByText(/87%/)).toBeVisible();
  });

  test("accept suggestion updates live preview", async ({ page }) => {
    await openEditorWithMocks(page);

    await page.getByPlaceholder(/paste the full job description/i).fill(SAMPLE_JD);
    await page.getByRole("button", { name: /analyze job description/i }).click();
    await page.waitForSelector("text=Kubernetes");
    await page.getByRole("button", { name: /optimize/i }).click();
    await page.waitForSelector("text=ATS match improved");

    // Accept the skills suggestion
    await page.getByRole("button", { name: /accept/i }).first().click();
    await expect(page.getByText(/changes applied/i)).toBeVisible({ timeout: 8_000 });

    // The center preview should now show the suggested skills (Go, Kubernetes)
    await expect(page.getByRole("main").getByText(/kubernetes/i)).toBeVisible({ timeout: 5_000 });
  });

  test("reject suggestion shows rejection toast", async ({ page }) => {
    await openEditorWithMocks(page);

    await page.getByPlaceholder(/paste the full job description/i).fill(SAMPLE_JD);
    await page.getByRole("button", { name: /analyze job description/i }).click();
    await page.waitForSelector("text=Kubernetes");
    await page.getByRole("button", { name: /optimize/i }).click();
    await page.waitForSelector("text=ATS match improved");

    await page.getByRole("button", { name: /reject/i }).first().click();
    await expect(page.getByText(/rejected|kept as-is/i)).toBeVisible({ timeout: 5_000 });
  });

  test("diff view expands when chevron is clicked", async ({ page }) => {
    await openEditorWithMocks(page);

    await page.getByPlaceholder(/paste the full job description/i).fill(SAMPLE_JD);
    await page.getByRole("button", { name: /analyze job description/i }).click();
    await page.waitForSelector("text=Kubernetes");
    await page.getByRole("button", { name: /optimize/i }).click();
    await page.waitForSelector("text=ATS match improved");

    // Expand the diff
    const chevron = page.locator("svg.lucide-chevron-down").first();
    await chevron.click();

    // Before / After columns should be visible
    await expect(page.getByText(/before/i)).toBeVisible();
    await expect(page.getByText(/after/i)).toBeVisible();
  });
});
