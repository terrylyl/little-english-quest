import { expect, test, type Page } from '@playwright/test';

async function completeFirstAnimalLevel(page: Page) {
  await page.goto('/');

  await page.getByRole('button', { name: /Animals/ }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: /I know these words/ }).click();
  await page.getByRole('button', { name: /cat/ }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: /Hold to say/ }).click();
  await page.getByRole('button', { name: /Finish/ }).click();
}

test('home screen shows the three learning worlds', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: /Animals/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fruits/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Food/ })).toBeVisible();
});

test('child can complete the first animal level', async ({ page }) => {
  await completeFirstAnimalLevel(page);

  await expect(page.getByRole('heading', { name: /Sticker earned/ })).toBeVisible();
});

test('explore mode shows twelve animal words', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Animals/ }).click();
  await page.getByRole('button', { name: /Explore/ }).click();

  await expect(page.getByRole('heading', { name: /Animals words/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Say cat/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Say monkey/ })).toBeVisible();
});

test('earned sticker persists after refresh', async ({ page }) => {
  await completeFirstAnimalLevel(page);
  await page.getByRole('button', { name: /Back to theme/ }).click();

  await page.reload();
  await page.getByRole('button', { name: /Animals/ }).click();

  await expect(page.getByText('1/3 levels done')).toBeVisible();
  await expect(page.getByRole('button', { name: /Level 1 Star/ })).toBeVisible();
});
