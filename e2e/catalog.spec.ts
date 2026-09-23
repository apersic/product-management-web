import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

type CatalogProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  tags: string[];
};

const mascara: CatalogProduct = {
  id: 1,
  title: 'Essence Mascara Lash Princess',
  description: 'Volumizing mascara.',
  category: 'beauty',
  price: 9.99,
  tags: ['beauty', 'mascara'],
};

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

async function installCatalog(
  page: Page,
  seed: readonly CatalogProduct[],
): Promise<{
  products: CatalogProduct[];
  posts: number;
}> {
  const products = seed.map((item) => ({ ...item, tags: [...item.tags] }));
  const counter = { posts: 0 };
  await page.route('http://127.0.0.1:3000/**', async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/products/search') {
      const skip = Number(url.searchParams.get('skip') ?? '0');
      const limit = Number(url.searchParams.get('limit') ?? '12');
      const text = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const matched =
        text === ''
          ? products
          : products.filter((item) =>
              `${item.title}\n${item.description}`.toLowerCase().includes(text),
            );
      await route.fulfill({
        headers: cors,
        json: {
          products: matched.slice(skip, skip + limit),
          total: matched.length,
          skip,
          limit,
        },
      });
      return;
    }
    const match = /^\/products\/(\d+)$/.exec(url.pathname);
    if (request.method() === 'GET' && match) {
      const found = products.find((item) => item.id === Number(match[1]));
      if (!found) {
        await route.fulfill({
          status: 404,
          headers: cors,
          json: { statusCode: 404, message: 'Product not found' },
        });
        return;
      }
      await route.fulfill({ headers: cors, json: found });
      return;
    }
    if (request.method() === 'POST' && url.pathname === '/products/add') {
      counter.posts += 1;
      const body = request.postDataJSON() as {
        title: string;
        description: string;
        category: string;
        price: number;
        tags: string[];
      };
      if (body.description === '') {
        await route.fulfill({
          status: 400,
          headers: cors,
          json: {
            statusCode: 400,
            message: 'Invalid product',
            issues: [{ path: 'description', message: 'Description must be at least 1 character' }],
          },
        });
        return;
      }
      const created = {
        ...body,
        id: products.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      };
      products.push(created);
      await route.fulfill({ status: 201, headers: cors, json: created });
      return;
    }
    if (request.method() === 'PUT' && match) {
      const body = request.postDataJSON() as Partial<CatalogProduct>;
      const index = products.findIndex((item) => item.id === Number(match[1]));
      const current = products[index];
      if (current === undefined) {
        await route.fulfill({
          status: 404,
          headers: cors,
          json: { statusCode: 404, message: 'Product not found' },
        });
        return;
      }
      const updated = { ...current, ...body, id: current.id };
      products[index] = updated;
      await route.fulfill({ headers: cors, json: updated });
      return;
    }
    if (request.method() === 'DELETE' && match) {
      const index = products.findIndex((item) => item.id === Number(match[1]));
      if (index === -1) {
        await route.fulfill({
          status: 404,
          headers: cors,
          json: { statusCode: 404, message: 'Product not found' },
        });
        return;
      }
      products.splice(index, 1);
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    await route.fulfill({
      status: 500,
      headers: cors,
      json: { message: 'The catalog request failed.' },
    });
  });
  return {
    products,
    get posts() {
      return counter.posts;
    },
  };
}

async function clickBackdrop(page: Page, dialog: Locator): Promise<void> {
  const box = await dialog.boundingBox();
  if (box === null) throw new Error('dialog has no box');
  await page.mouse.click(box.x + box.width / 2, Math.max(4, box.y - 12));
}

test('list shows title, price, and a thumbnail', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
  await expect(page.getByText('$9.99')).toBeVisible();
  const image = page.locator('.card img');
  await expect(image).toHaveAttribute('src', /^data:image\/svg\+xml,/);
});

test('list has no accessibility violations', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('a product opens its detail', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/');
  await page.getByRole('link', { name: /Essence Mascara/ }).click();
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
  await expect(page.getByText('Volumizing mascara.')).toBeVisible();
  await expect(page.getByText('Beauty', { exact: true })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: /^mascara$/ })).toBeVisible();
});

test('an unknown id explains that the product is missing', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/products/nope');
  await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
  await page.goto('/products/999');
  await expect(page.getByText('This product is not in the catalog.')).toBeVisible();
});

test('create validates before saving, then shows the new product', async ({ page }) => {
  const catalog = await installCatalog(page, [mascara]);
  await page.goto('/');
  await page.getByRole('button', { name: 'New product' }).click();
  await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByText('Title is required')).toBeVisible();
  await expect(page.getByText('Price is required')).toBeVisible();
  expect(catalog.posts).toBe(0);

  await page.getByLabel('Title').fill('Sunset Balm');
  await page.getByLabel('Price').fill('12.50');
  await page.getByLabel('Description').fill('Tinted lip balm.');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Product created' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sunset Balm' })).toBeVisible();
  expect(catalog.posts).toBe(1);
});

test('a blank description is required', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/');
  await page.getByRole('button', { name: 'New product' }).click();
  await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();
  await expect(page.locator('label[for="product-description"]')).toHaveText('Description');
  await page.getByLabel('Title').fill('Sunset Balm');
  await page.getByLabel('Price').fill('12.50');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByText('Description is required')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();
});

test('edit saves the new title', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/products/1');
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit product' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Essence Mascara Lash Princess');
  await page.getByLabel('Title').fill('Renamed mascara');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Product updated' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Renamed mascara' })).toBeVisible();
});

test('a failed list request can be retried', async ({ page }) => {
  let fail = true;
  await page.route('http://127.0.0.1:3000/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    if (fail) {
      await route.fulfill({
        status: 500,
        headers: cors,
        json: { message: 'The catalog request failed.' },
      });
      return;
    }
    await route.fulfill({
      headers: cors,
      json: { products: [mascara], total: 1, skip: 0, limit: 12 },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText('The catalog request failed.');
  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
});

test('the list stays readable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await installCatalog(page, [mascara]);
  await page.goto('/');
  const card = page.locator('.card');
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
});

test('row spacing matches column spacing', async ({ page }) => {
  await installCatalog(page, [
    mascara,
    { ...mascara, id: 2, title: 'Red Lipstick' },
    { ...mascara, id: 3, title: 'Powder' },
    { ...mascara, id: 4, title: 'Liner' },
  ]);
  await page.setViewportSize({ width: 900, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Liner' })).toBeVisible();
  const gap = await page.locator('.grid').evaluate((grid) => {
    const style = getComputedStyle(grid);
    const cards = [...grid.querySelectorAll('.card')].map((card) => card.getBoundingClientRect());
    const first = cards[0];
    const beside = cards[1];
    const below = cards.find((card) => first !== undefined && card.top > first.bottom);
    if (first === undefined || beside === undefined || below === undefined) {
      throw new Error('expected cards in two rows');
    }
    return {
      row: style.rowGap,
      column: style.columnGap,
      columnSpace: beside.left - first.right,
      rowSpace: below.top - first.bottom,
      cardHeight: first.height,
      besideHeight: beside.height,
    };
  });
  expect(gap.row).toBe(gap.column);
  expect(gap.row).toBe('16px');
  expect(gap.rowSpace).toBeGreaterThan(12);
  expect(Math.abs(gap.rowSpace - gap.columnSpace)).toBeLessThan(2);
  expect(Math.abs(gap.cardHeight - gap.besideHeight)).toBeLessThan(1);
  expect(gap.cardHeight).toBeGreaterThan(240);
});

test('search waits, then filters the list', async ({ page }) => {
  await installCatalog(page, [
    mascara,
    { ...mascara, id: 2, title: 'Red Lipstick', description: 'A bold lipstick.' },
  ]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Red Lipstick' })).toBeVisible();
  await page.getByLabel('Search').fill('lipstick');
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Red Lipstick' })).toBeVisible();
});

test('clicking outside create or edit closes the dialog', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/');
  await page.getByRole('button', { name: 'New product' }).click();
  const createDialog = page.getByRole('dialog', { name: 'New product' });
  await expect(createDialog).toBeVisible();
  await clickBackdrop(page, createDialog);
  await expect(createDialog).toBeHidden();

  await page.getByRole('link', { name: /Essence Mascara/ }).click();
  await page.getByRole('button', { name: 'Edit product' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit product' });
  await expect(editDialog).toBeVisible();
  await clickBackdrop(page, editDialog);
  await expect(editDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
});

test('the catalog card has no delete control', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Delete/ })).toHaveCount(0);
});

test('a page control jumps to that page', async ({ page }) => {
  const products = Array.from({ length: 13 }, (_, index) => ({
    ...mascara,
    id: index + 1,
    title: `Product ${index + 1}`,
  }));
  await installCatalog(page, products);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Product 1', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Pages' });
  const navBox = await nav.boundingBox();
  const mainBox = await page.locator('main').boundingBox();
  expect(navBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(navBox!.x + navBox!.width).toBeGreaterThan(mainBox!.x + mainBox!.width - 24);
  await page.getByRole('button', { name: 'Page 2' }).click();
  await expect(page.getByRole('heading', { name: 'Product 13', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Product 1', exact: true })).toBeHidden();
});

test('detail prefixes the back link with an arrow and can delete', async ({ page }) => {
  await installCatalog(page, [mascara]);
  await page.goto('/products/1');
  const back = page.getByRole('link', { name: 'Back to products' });
  await expect(back.locator('svg')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Essence Mascara Lash Princess' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page
    .getByRole('dialog', { name: 'Delete product' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
  await expect(page.getByText('No products yet.')).toBeVisible();
});
