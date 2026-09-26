import { test, expect } from "@playwright/test";
test("complete simulation integration suite", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test=1");
  await page
    .getByRole("button", { name: "Run integration checks", exact: true })
    .click();
  await expect(page.locator("#test-panel")).toHaveAttribute(
    "data-result",
    "pass",
    { timeout: 80000 },
  );
  await expect(page.locator("#test-panel")).toHaveAttribute("data-total", "15");
  expect(errors).toEqual([]);
});
test("lobby, guide, settings, practice, map and pause work through real controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#deploy")).toBeVisible();
  await page
    .getByRole("button", { name: "HƯỚNG DẪN", exact: true })
    .first()
    .click();
  await expect(page.locator("#guide")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#guide")).toBeHidden();
  await page.locator("#mode-practice").click();
  await page.locator("#deploy").click();
  await expect(page.locator("#hud")).toBeVisible();
  await page.keyboard.press("2");
  await expect(page.locator("#weapon-name")).toHaveText("Kar98k");
  await page.keyboard.press("v");
  await expect(page.locator("#scope")).toBeVisible();
  await page.keyboard.press("m");
  await expect(page.locator("#tactical-map")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#tactical-map")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeVisible();
  await page.locator("#return-lobby").click();
  await expect(page.locator("#lobby")).toBeVisible();
});
