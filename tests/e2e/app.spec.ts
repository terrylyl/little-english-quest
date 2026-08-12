import { expect, test, type Page } from '@playwright/test';

const ROUNDS = 4;

async function readPlayPrompt(page: Page) {
  const prompt = await page.getByText(/Tap the picture for/).textContent();
  const word = prompt?.match(/Tap the picture for (.+)\./)?.[1];
  if (!word) throw new Error('Picture match prompt did not contain a target word.');
  return word;
}

async function readListenPrompt(page: Page) {
  const heading = await page.getByRole('heading', { name: /Can you find/ }).textContent();
  const word = heading?.match(/“(.+)”/)?.[1];
  if (!word) throw new Error('Listen prompt did not contain a target word.');
  return word;
}

async function clearRounds(page: Page, readPrompt: (page: Page) => Promise<string>, lastLabel: RegExp) {
  for (let round = 1; round <= ROUNDS; round += 1) {
    await page.getByRole('button', { name: `Picture: ${await readPrompt(page)}` }).click();
    await page.getByRole('button', { name: round === ROUNDS ? lastLabel : /Next word/ }).click();
  }
}

async function advanceToSpeaking(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Animals/ }).click();
  await page.getByRole('button', { name: /Start Level 1/ }).click();
  await expect(page.getByRole('button', { name: /^Say / })).toHaveCount(4);
  await page.getByRole('button', { name: /Ready to play/ }).click();
  await expect(page.getByRole('heading', { name: 'Picture match' })).toBeVisible();
  await clearRounds(page, readPlayPrompt, /Next: listening/);
  await clearRounds(page, readListenPrompt, /Next: speaking/);
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
  await expect(page.getByRole('status')).toContainText('recording is ready');
  await expect(page.getByRole('button', { name: /Next: use the word/ })).toBeEnabled();
  await page.getByRole('button', { name: /Next: use the word/ }).click();
  await page.getByRole('button', { name: /I said it/ }).click();
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
  await expect(page.locator('.reward-sticker')).toHaveCount(4);
  await page.getByRole('button', { name: /Collect rewards/ }).click();

  await page.reload();
  await expect(page.getByLabel('3 stars collected')).toBeVisible();
  await page.getByRole('button', { name: /Animals 4 of 50 words/ }).click();
  await expect(page.getByText('1/5 levels done')).toBeVisible();
  await expect(page.locator('.sticker.is-earned')).toHaveCount(4);
  await expect(page.getByRole('button', { name: /Level 1 Completed/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start Level 2/ })).toBeVisible();
});
