import type { SearchPage } from './product';

export const PAGE_SIZE = 12;

export function lastPageSkip(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.floor((total - 1) / pageSize) * pageSize;
}

export function skipForProduct(page: SearchPage, productId: number, pageSize: number): number {
  if (page.products.some((item) => item.id === productId)) return page.skip;
  return lastPageSkip(page.total, pageSize);
}

export function pageRange(page: SearchPage): string {
  if (page.total === 0 || page.products.length === 0) return `0 of ${page.total}`;
  const start = page.skip + 1;
  const end = page.skip + page.products.length;
  return `${start}-${end} of ${page.total}`;
}

export function emptyListMessage(page: SearchPage, query = ''): string | null {
  if (page.products.length > 0) return null;
  if (query.trim() !== '') return 'No products match that search.';
  if (page.total === 0) return 'No products yet.';
  return 'No products on this page.';
}

export type PageControl =
  | {
      readonly kind: 'page';
      readonly key: string;
      readonly page: number;
      readonly skip: number;
      readonly current: boolean;
    }
  | { readonly kind: 'gap'; readonly key: string };

export function pageCount(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function pageControls(
  total: number,
  pageSize: number,
  skip: number,
): readonly PageControl[] {
  const count = pageCount(total, pageSize);
  const current = pageSize <= 0 ? 1 : Math.floor(skip / pageSize) + 1;
  const wanted = new Set<number>([1, count]);
  for (let page = current - 1; page <= current + 1; page += 1) {
    if (page >= 1 && page <= count) wanted.add(page);
  }
  const pages = [...wanted].sort((left, right) => left - right);
  const controls: PageControl[] = [];
  let previous = 0;
  for (const page of pages) {
    if (previous !== 0 && page - previous > 1) {
      controls.push({ kind: 'gap', key: `gap-${previous}` });
    }
    controls.push({
      kind: 'page',
      key: `page-${page}`,
      page,
      skip: (page - 1) * pageSize,
      current: page === current,
    });
    previous = page;
  }
  return controls;
}

export function parseRouteId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}
