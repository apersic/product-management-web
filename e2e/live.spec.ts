import { expect, test } from '@playwright/test';

const live = process.env['LIVE'];

test.describe('live catalog', () => {
  test.skip(!live, 'Set LIVE=1 to run against the API on port 3000');

  test('the seeded list and detail come from the API', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Essence Mascara Lash Princess' }),
    ).toBeVisible();
    await page.getByRole('link', { name: /Essence Mascara/ }).click();
    await expect(page.getByText('popular mascara')).toBeVisible();
    await expect(page.getByText('$9.99')).toBeVisible();
    await expect(page.getByText('Beauty', { exact: true })).toBeVisible();
  });

  test('create and update round-trip through the API', async ({ page }) => {
    const title = `Check balm ${Date.now()}`;
    const renamed = `${title} renamed`;
    await page.goto('/');
    await page.getByRole('button', { name: 'New product' }).click();
    await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Price').fill('12.50');
    await page.getByLabel('Description').fill('Tinted lip balm.');
    await page.getByLabel('Tags').fill('lip, tint');
    await page.getByRole('button', { name: 'Save product' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Product created' })).toBeVisible();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.getByRole('link', { name: new RegExp(title) }).click();
    await page.getByRole('button', { name: 'Edit product' }).click();
    await expect(page.getByLabel('Title')).toHaveValue(title);
    await page.getByLabel('Title').fill(renamed);
    await page.getByRole('button', { name: 'Save product' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Product updated' })).toBeVisible();
    await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
    await expect(page.getByText('Tinted lip balm.')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^lip$/ })).toBeVisible();
  });
});
