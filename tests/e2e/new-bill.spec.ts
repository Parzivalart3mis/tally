import { test, expect } from '@playwright/test';

/**
 * Flow 1 — New bill end to end (manual entry keeps it independent of model
 * keys): add items, correct a price, assign to two people, compute with the
 * Exact engine, see the sum-check go green, save, and find it in history.
 */
test('create a bill, compute exactly, save, and see it in history', async ({
  page,
}) => {
  await page.goto('/app/new');

  // Skip extraction; enter the bill by hand.
  await page.getByRole('button', { name: 'Enter manually' }).click();

  // Review: name the place and fill two items.
  await page.getByLabel('Place').fill('Test Diner');
  const firstName = page.getByLabel('Item name').first();
  await firstName.fill('Pizza');
  await page.getByLabel('Line total').first().fill('20.00');

  await page.getByRole('button', { name: 'Add a line' }).click();
  await page.getByLabel('Item name').nth(1).fill('Salad');
  await page.getByLabel('Line total').nth(1).fill('10.00');

  // Derive subtotal + grand total from the items.
  await page.getByRole('button', { name: 'Fill from items' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();

  // Assign: Pizza to two people, Salad to one. (Yash + Prakriti are seeded.)
  const pizzaCard = page
    .locator('li', { hasText: 'Pizza' })
    .first();
  await pizzaCard.getByRole('button', { name: /Add Yash/ }).click();
  await pizzaCard.getByRole('button', { name: /Add Prakriti/ }).click();

  const saladCard = page.locator('li', { hasText: 'Salad' }).first();
  await saladCard.getByRole('button', { name: /Add Yash/ }).click();

  await page.getByRole('button', { name: 'Calculate' }).click();

  // Result: the sum-check reconciles.
  await expect(page.getByText('Adds up')).toBeVisible();
  await expect(page.getByText('Per person')).toBeVisible();

  await page.getByRole('button', { name: 'Save bill' }).click();

  // Lands on the saved bill detail.
  await expect(page).toHaveURL(/\/app\/bills\//);
  await expect(page.getByText('Test Diner')).toBeVisible();

  // And it shows up in history.
  await page.goto('/app');
  await expect(page.getByText('Test Diner').first()).toBeVisible();
});
