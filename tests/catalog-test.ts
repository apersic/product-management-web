import QUnit from 'qunit';
import { CatalogError } from '../src/app/catalog/catalog-error';
import { readProduct, readSearchPage } from '../src/app/catalog/product-json';
import { debounce } from '../src/app/helpers/debounce';
import {
  emptyListMessage,
  formatPrice,
  lastPageSkip,
  pageControls,
  pageRange,
  parseRouteId,
  skipForProduct,
} from '../src/app/catalog/catalog-page';
import { thumbnailSrc } from '../src/app/catalog/thumbnail';

const mascara = {
  id: 1,
  title: 'Essence Mascara Lash Princess',
  description: 'Volumizing mascara.',
  category: 'beauty',
  price: 9.99,
  tags: ['beauty', 'mascara'],
};

QUnit.module('catalog json');

QUnit.test('readProduct keeps the fields the list renders', (assert) => {
  assert.deepEqual(readProduct(mascara), mascara);
  assert.throws(() => readProduct({ id: 1, title: 'Missing the rest' }), CatalogError);
});

QUnit.test('readSearchPage reads one page', (assert) => {
  assert.deepEqual(readSearchPage({ products: [mascara], total: 194, skip: 12, limit: 12 }), {
    products: [mascara],
    total: 194,
    skip: 12,
    limit: 12,
  });
});

QUnit.module('catalog pages');

QUnit.test('pagination lands on the page that can show a new id', (assert) => {
  assert.strictEqual(lastPageSkip(194, 12), 192);
  assert.strictEqual(lastPageSkip(1, 12), 0);
  const first = { products: [mascara], total: 20, skip: 0, limit: 12 };
  assert.strictEqual(skipForProduct(first, 1, 12), 0);
  assert.strictEqual(skipForProduct(first, 20, 12), 12);
  assert.strictEqual(
    pageRange({ products: [mascara], total: 194, skip: 0, limit: 12 }),
    '1-1 of 194',
  );
  assert.strictEqual(
    emptyListMessage({ products: [], total: 0, skip: 0, limit: 12 }),
    'No products yet.',
  );
  assert.strictEqual(
    emptyListMessage({ products: [], total: 3, skip: 12, limit: 12 }),
    'No products on this page.',
  );
  assert.strictEqual(
    emptyListMessage({ products: [], total: 0, skip: 0, limit: 12 }, 'balm'),
    'No products match that search.',
  );
  const firstPage = pageControls(194, 12, 0).map((control) => control.key);
  assert.deepEqual(firstPage, ['page-1', 'page-2', 'gap-2', 'page-17']);
  const lastPage = pageControls(194, 12, 192).map((control) => control.key);
  assert.deepEqual(lastPage, ['page-1', 'gap-1', 'page-16', 'page-17']);
});

QUnit.test('search waits for a pause before it runs', (assert) => {
  const done = assert.async();
  const calls: string[] = [];
  const run = debounce((value: string) => {
    calls.push(value);
  }, 20);
  run('s');
  run('su');
  run.cancel();
  run('sun');
  setTimeout(() => {
    assert.deepEqual(calls, ['sun']);
    done();
  }, 50);
});

QUnit.test('route ids and prices match what the screen shows', (assert) => {
  assert.strictEqual(parseRouteId('1'), 1);
  assert.strictEqual(parseRouteId('0'), null);
  assert.strictEqual(parseRouteId('nope'), null);
  assert.strictEqual(formatPrice(9.99), '$9.99');
  const src = thumbnailSrc('Mascara');
  assert.true(src.startsWith('data:image/svg+xml,'));
  const svg = decodeURIComponent(src.slice('data:image/svg+xml,'.length));
  assert.true(svg.includes('>M<'));
  assert.true(svg.includes('x="160" y="160"'));
  assert.true(svg.includes('dominant-baseline="central"'));
});
