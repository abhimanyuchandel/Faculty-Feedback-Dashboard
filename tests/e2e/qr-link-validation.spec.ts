import { expect, test } from "@playwright/test";

test("public route template exists", async ({ page }) => {
  await page.goto("/search");
  await expect(page).toHaveURL(/\/search$/);
});
