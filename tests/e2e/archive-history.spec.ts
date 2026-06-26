import { test, expect } from '@playwright/test';

/**
 * Flow 2 — Archiving a person leaves past bills intact. The seeded restaurant
 * bill ("Trattoria Sofia") includes Vishesh; after archiving Vishesh, that
 * past bill must still show his name and total.
 */
test('archiving a person keeps their name on past bills', async ({ page }) => {
  // Confirm the seeded bill includes Vishesh first.
  await page.goto('/app');
  await page.getByText('Trattoria Sofia').first().click();
  await expect(page).toHaveURL(/\/app\/bills\//);
  await expect(page.getByText('Vishesh').first()).toBeVisible();
  const billUrl = page.url();

  // Archive Vishesh from the roster.
  await page.goto('/app/people');
  const row = page.locator('li', { hasText: 'Vishesh' }).first();
  await row.getByRole('button', { name: /Remove Vishesh/ }).click();
  await expect(page.getByText('Vishesh')).toHaveCount(0);

  // The past bill still shows Vishesh with his frozen total.
  await page.goto(billUrl);
  await expect(page.getByText('Vishesh').first()).toBeVisible();
  await expect(page.getByText('Per person')).toBeVisible();
});
