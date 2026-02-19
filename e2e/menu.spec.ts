import { test, expect } from "@playwright/test";

test.describe("Menu app", () => {
  test("loads page and shows location selector or empty state", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("combobox", { name: /location/i }).or(page.getByText("No locations available")).or(page.getByRole("alert"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("selecting a location loads categories and menu or empty state", async ({ page }) => {
    await page.goto("/");

    const selector = page.getByRole("combobox", { name: /location/i });
    const noLocations = page.getByText("No locations available");

    const selectorVisible = await selector.isVisible().catch(() => false);
    const noLocVisible = await noLocations.isVisible().catch(() => false);

    if (noLocVisible) {
      await expect(noLocations).toBeVisible();
      return;
    }

    if (!selectorVisible) {
      await expect(
        page.getByText("No locations").or(page.getByRole("alert")).or(selector)
      ).toBeVisible({ timeout: 15_000 });
      return;
    }

    await selector.selectOption({ index: 1 });

    await expect(
      page.getByRole("tablist").or(page.getByText("No items found for this location")).or(page.getByPlaceholder("Search menu"))
    ).toBeVisible({ timeout: 15_000 });
  });
});
