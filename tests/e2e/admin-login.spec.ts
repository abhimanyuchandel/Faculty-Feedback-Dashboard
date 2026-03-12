import { expect, test } from "@playwright/test";

test("admin login page loads", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByText("Admin sign in")).toBeVisible();
});
