import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll, expectNoSeriousAxeViolations, expectNoTechnicalCandidateVocabulary } from './helpers';

test('J1 completes profile capture and first exploration with the fallback chat', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Puente Laboral Panamá' })).toBeVisible();
  await page.getByRole('link', { name: /Empezar/ }).click();
  await expect(page.getByRole('heading', { name: 'Conversemos sobre ti' })).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  // The fallback agenda has eight profile chips and five preference chips.
  for (let step = 0; step < 13; step += 1) {
    const chip = page.locator('.chat-chip').last();
    await expect(chip).toBeVisible({ timeout: 45_000 });
    await chip.click();
  }

  await expect(page).toHaveURL(/\/vacantes$/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'Vacantes para ti' })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoTechnicalCandidateVocabulary(page);
  await expectNoSeriousAxeViolations(page);
});
