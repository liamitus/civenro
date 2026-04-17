import { expect, test } from "@playwright/test";

/**
 * Smoke tests — just verify pages render without server errors.
 * Not meant to assert business logic; that's what unit tests are for.
 */

test("home page renders", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/govroll/i);
});

test("bills listing page renders", async ({ page }) => {
  const response = await page.goto("/bills");
  expect(response?.status()).toBeLessThan(400);
  // Either bill cards show up or the empty state does — both are valid.
  await expect(page.locator("main")).toBeVisible();
});

test("about page renders", async ({ page }) => {
  const response = await page.goto("/about");
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator("main")).toBeVisible();
});

test("privacy page renders", async ({ page }) => {
  const response = await page.goto("/privacy");
  expect(response?.status()).toBeLessThan(400);
});

test("contact page renders", async ({ page }) => {
  const response = await page.goto("/contact");
  expect(response?.status()).toBeLessThan(400);
});
