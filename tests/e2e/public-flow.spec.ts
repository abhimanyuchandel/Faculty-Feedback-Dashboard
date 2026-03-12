import { expect, test } from "@playwright/test";

test("home and search pages render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Anonymous Faculty Feedback")).toBeVisible();

  await page.goto("/search");
  await expect(page.getByText("Find Faculty")).toBeVisible();
});
