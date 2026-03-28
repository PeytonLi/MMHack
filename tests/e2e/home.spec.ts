import { expect, test } from "@playwright/test";

test("home page exposes the scaffolded workflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /turns a produce photo into a pricing decision/i })).toBeVisible();
  const captureNavLink = page.getByRole("link", { exact: true, name: "Capture" });

  await expect(captureNavLink).toBeVisible();
  await captureNavLink.click();

  await expect(page.getByRole("heading", { name: /employee-controlled phone capture/i })).toBeVisible();
});
