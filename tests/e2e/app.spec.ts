import { expect, test, type Page } from '@playwright/test';

async function advanceToSpeaking(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Animals/ }).click();
  await page.getByRole('button', { name: /Start Level 1/ }).click();
  await expect(page.getByRole('button', { name: /^Say / })).toHaveCount(4);
  await page.getByRole('button', { name: /Ready to play/ }).click();
  const gameChoices = page.getByRole('button', { name: /^Choose / });
  for (const choice of await gameChoices.all()) {
    if (await page.getByRole('button', { name: /Next: listening/ }).isEnabled()) break;
    await choice.click();
  }
  await page.getByRole('button', { name: /Next: listening/ }).click();

  const heading = await page.getByRole('heading', { name: /Can you find/ }).textContent();
  const promptWord = heading?.match(/“(.+)”/)?.[1];
  if (!promptWord) throw new Error('Listen prompt did not contain a target word.');
  await page.getByRole('button', { name: `Choose ${promptWord}` }).click();
  await page.getByRole('button', { name: /Next: speaking/ }).click();
}

async function completeFirstAnimalLevel(page: Page) {
  await advanceToSpeaking(page);

  const hold = page.locator('.mic-button');
  await expect(page.getByRole('button', { name: /Next: use the word/ })).toBeDisabled();
  await hold.hover();
  await page.mouse.down();
  await expect(hold).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(page.getByRole('status')).toContainText('heard your voice');
  await expect(page.getByRole('button', { name: /Next: use the word/ })).toBeEnabled();
  await page.getByRole('button', { name: /Next: use the word/ }).click();
  await page.getByRole('button', { name: /I did it/ }).click();
}

test('home screen shows six local illustrated learning worlds', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('button', { name: /Animals/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fruits/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Food/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Toys/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Colors/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Vehicles/ })).toBeVisible();
  await expect(page.locator('.theme-tile__art img')).toHaveCount(6);
  await expect(page.locator('.theme-tile__art img').first()).toHaveAttribute('src', /illustrations/);
});

test('child completes a four-word lesson through listening and speaking', async ({ page }) => {
  await completeFirstAnimalLevel(page);
  await expect(page.getByRole('heading', { name: /Quest complete/ })).toBeVisible();
});

test('explore mode shows fifty illustrated animal words', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Animals/ }).click();
  await page.getByRole('button', { name: /Explore/ }).click();

  await expect(page.getByRole('heading', { name: /Animals words/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Say cat/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Say / })).toHaveCount(50);
  await expect(page.locator('.word-card__art img')).toHaveCount(50);
});

test('earned sticker persists after refresh', async ({ page }) => {
  await completeFirstAnimalLevel(page);
  await page.getByRole('button', { name: /Collect rewards/ }).click();

  await page.reload();
  await page.getByRole('button', { name: /Animals/ }).click();
  await expect(page.getByText('1/5 levels done')).toBeVisible();
  await expect(page.getByRole('button', { name: /Level 1 Completed/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start Level 2/ })).toBeVisible();
});
