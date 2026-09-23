import QUnit from 'qunit';
import {
  priceError,
  titleError,
  toProductWriteBody,
  descriptionError,
} from '../src/app/catalog/product-form';

const valid = {
  title: 'Sunset Balm',
  price: '12.50',
  description: 'Tinted lip balm.',
  category: 'beauty',
  tags: ' lip , tint ',
};

QUnit.module('product form');

QUnit.test('title, price, and description are required before a write body exists', (assert) => {
  assert.strictEqual(titleError('   '), 'Title is required');
  assert.strictEqual(priceError(''), 'Price is required');
  assert.strictEqual(priceError('0'), 'Price must be a positive number');
  assert.strictEqual(priceError('-3'), 'Price must be a positive number');
  assert.strictEqual(priceError('1.239'), 'Price must have at most 2 decimal places');
  assert.strictEqual(descriptionError(''), 'Description is required');
  assert.strictEqual(descriptionError('   '), 'Description is required');
  assert.strictEqual(
    toProductWriteBody({ ...valid, title: ' ', price: '0', description: ' ' }),
    null,
  );
});

QUnit.test('a valid form becomes the catalog write body', (assert) => {
  assert.strictEqual(priceError('12.50'), null);
  assert.strictEqual(descriptionError(valid.description), null);
  assert.deepEqual(toProductWriteBody(valid), {
    title: 'Sunset Balm',
    description: 'Tinted lip balm.',
    category: 'beauty',
    price: 12.5,
    tags: ['lip', 'tint'],
  });
});
