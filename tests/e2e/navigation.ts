import type { Page } from "@playwright/test";

export async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "Open navigation", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name, exact: true }).click();
}
