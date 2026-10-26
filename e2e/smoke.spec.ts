import { expect, test } from "@playwright/test";

test("estimate becomes an invoice, then a receipt", async ({ page }) => {
  await page.goto("/jobs/j7");
  await page.getByRole("button", { name: "Send estimate" }).click();
  await page.getByRole("button", { name: "Sign as client" }).click();
  await page.getByRole("button", { name: "Convert to invoice" }).click();
  await expect(page.getByRole("article", { name: /Invoice for TL-1037/ })).toBeVisible();

  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("article", { name: /Receipt for TL-1037/ })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download receipt (PDF)" }).click();
  expect((await download).suggestedFilename()).toBe("TL-1037-receipt.pdf");
});

test("a board move that breaks a rule is blocked with a reason", async ({ page }) => {
  await page.goto("/board");
  const card = await page.locator('[aria-label^="TL-1032"]').boundingBox();
  const column = await page.locator('section[aria-label="Punch List"]').boundingBox();
  await page.mouse.move(card!.x + 40, card!.y + 20);
  await page.mouse.down();
  await page.mouse.move(card!.x + 60, card!.y + 30, { steps: 5 });
  await page.mouse.move(column!.x + 60, column!.y + 120, { steps: 15 });
  await page.mouse.up();
  await expect(page.getByText(/is waiting for approval/)).toBeVisible();
  await expect(page.locator('section[aria-label="In Progress"]').getByText("Main floor LVP")).toBeVisible();
});

test("the PM view hides commission", async ({ page }) => {
  await page.goto("/margins");
  await expect(page.getByText("Hidden")).toBeVisible();
  await page.getByRole("radio", { name: "Accounting" }).click();
  await expect(page.getByText("Net after commission")).toBeVisible();
});
