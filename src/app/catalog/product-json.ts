import { CatalogError } from './catalog-error';
import type { Product, SearchPage } from './product';

const UNEXPECTED_PRODUCT = 'The catalog returned an unexpected product.';
const UNEXPECTED_PAGE = 'The catalog returned an unexpected page.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isWhole(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function readProduct(raw: unknown): Product {
  if (!isRecord(raw)) throw new CatalogError(0, UNEXPECTED_PRODUCT);
  const id = raw['id'];
  const title = raw['title'];
  const description = raw['description'];
  const category = raw['category'];
  const price = raw['price'];
  const tags = raw['tags'];
  if (
    typeof id !== 'number' ||
    !Number.isInteger(id) ||
    id <= 0 ||
    typeof title !== 'string' ||
    typeof description !== 'string' ||
    typeof category !== 'string' ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    !isStringArray(tags)
  ) {
    throw new CatalogError(0, UNEXPECTED_PRODUCT);
  }
  return { id, title, description, category, price, tags };
}

export function readSearchPage(raw: unknown): SearchPage {
  if (!isRecord(raw)) throw new CatalogError(0, UNEXPECTED_PAGE);
  const products = raw['products'];
  const total = raw['total'];
  const skip = raw['skip'];
  const limit = raw['limit'];
  if (!Array.isArray(products) || !isWhole(total) || !isWhole(skip) || !isWhole(limit)) {
    throw new CatalogError(0, UNEXPECTED_PAGE);
  }
  return {
    products: products.map((item) => readProduct(item)),
    total,
    skip,
    limit,
  };
}
