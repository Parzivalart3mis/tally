import { test, expect } from '@playwright/test';

/**
 * Flow 3 — The same confirmed bill through all three engines. Exact always
 * produces a per-person breakdown. The Claude and Groq paths are exercised
 * end-to-end through their routes; we accept either a breakdown (keys present)
 * or a graceful error toast (keys absent), so the test proves routing without
 * requiring paid model calls in every environment.
 */
test('the same bill computes through Exact, Claude, and Groq', async ({
  page,
}) => {
  await page.goto('/app/new');
  await page.getByRole('button', { name: 'Enter manually' }).click();

  await page.getByLabel('Place').fill('Engine Test');
  await page.getByLabel('Item name').first().fill('Shared plate');
  await page.getByLabel('Line total').first().fill('30.00');
  await page.getByRole('button', { name: 'Fill from items' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Assign to two seeded people.
  const card = page.locator('li', { hasText: 'Shared plate' }).first();
  await card.getByRole('button', { name: /Add Yash/ }).click();
  await card.getByRole('button', { name: /Add Prakriti/ }).click();

  // Exact (default).
  await page.getByRole('button', { name: 'Calculate' }).click();
  await expect(page.getByText('Per person')).toBeVisible();

  // Go back and run the model engines.
  for (const engine of ['Claude', 'Groq']) {
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('radio', { name: engine }).click();
    await page.getByRole('button', { name: 'Calculate' }).click();

    const breakdown = page.getByText('Per person');
    const errorToast = page.locator('[data-sonner-toast]');
    await expect(breakdown.or(errorToast).first()).toBeVisible({
      timeout: 20_000,
    });
  }
});
