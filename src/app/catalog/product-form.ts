import { isCategorySlug } from './product';

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 5000;
export const TAG_MAX = 40;
export const TAG_MAX_COUNT = 20;

export type ProductFormInput = {
  readonly title: string;
  readonly price: string;
  readonly description: string;
  readonly category: string;
  readonly tags: string;
};

export type ProductWriteBody = {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly price: number;
  readonly tags: readonly string[];
};

const PRICE = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
const TOO_MANY_DECIMALS = /^(?:0|[1-9]\d*)\.\d{3,}$/;

export function titleError(raw: string): string | null {
  const title = raw.trim();
  if (title === '') return 'Title is required';
  if (title.length > TITLE_MAX) return `Title must be at most ${TITLE_MAX} characters`;
  return null;
}

export function priceError(raw: string): string | null {
  const price = raw.trim();
  if (price === '') return 'Price is required';
  if (TOO_MANY_DECIMALS.test(price)) return 'Price must have at most 2 decimal places';
  if (!PRICE.test(price)) return 'Price must be a positive number';
  if (!(Number(price) > 0)) return 'Price must be a positive number';
  return null;
}

export function descriptionError(raw: string): string | null {
  const description = raw.trim();
  if (description === '') return 'Description is required';
  if (description.length > DESCRIPTION_MAX) {
    return `Description must be at most ${DESCRIPTION_MAX} characters`;
  }
  return null;
}

export function categoryError(raw: string): string | null {
  if (!isCategorySlug(raw)) return 'Choose a category';
  return null;
}

export function splitTags(raw: string): readonly string[] {
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');
}

export function tagsError(raw: string): string | null {
  const tags = splitTags(raw);
  if (tags.length > TAG_MAX_COUNT) return `At most ${TAG_MAX_COUNT} tags`;
  if (tags.some((tag) => tag.length > TAG_MAX)) {
    return `A tag must be at most ${TAG_MAX} characters`;
  }
  return null;
}

export function toProductWriteBody(input: ProductFormInput): ProductWriteBody | null {
  if (
    titleError(input.title) !== null ||
    priceError(input.price) !== null ||
    descriptionError(input.description) !== null ||
    categoryError(input.category) !== null ||
    tagsError(input.tags) !== null
  ) {
    return null;
  }
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    price: Number(input.price.trim()),
    tags: splitTags(input.tags),
  };
}
