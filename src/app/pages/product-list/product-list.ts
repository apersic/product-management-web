import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  emptyListMessage,
  formatPrice,
  PAGE_SIZE,
  skipForProduct,
} from '../../catalog/catalog-page';
import { debounce } from '../../helpers/debounce';
import { toCatalogError, ProductApi } from '../../catalog/product-api';
import type { Product, SearchPage } from '../../catalog/product';
import { thumbnailSrc } from '../../catalog/thumbnail';
import { Pager } from '../../ui/pager/pager';
import { ProductFormModal } from '../../ui/product-form-modal/product-form-modal';

type ListState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly page: SearchPage };

const SEARCH_DELAY = 300;

@Component({
  selector: 'app-product-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProductFormModal, Pager],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList {
  private readonly api = inject(ProductApi);
  private readonly platformId = inject(PLATFORM_ID);
  private requestId = 0;

  private created: Product | null = null;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly skip = signal(0);
  protected readonly query = signal('');
  private readonly debouncedQuery = signal('');
  private readonly reload = signal(0);
  protected readonly creating = signal(false);
  protected readonly state = signal<ListState>({ status: 'loading' });
  protected readonly thumbnailSrc = thumbnailSrc;
  protected readonly formatPrice = formatPrice;
  private readonly searchDebounced = debounce((value: string) => {
    this.debouncedQuery.set(value);
    this.skip.set(0);
  }, SEARCH_DELAY);

  protected readonly page = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.page : null;
  });

  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.message : null;
  });

  protected readonly emptyMessage = computed(() => {
    const page = this.page();
    return page === null ? null : emptyListMessage(page, this.debouncedQuery());
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.searchDebounced.cancel());
    effect(() => {
      const skip = this.skip();
      const query = this.debouncedQuery();
      this.reload();
      if (!isPlatformBrowser(this.platformId)) return;
      void this.load(skip, query);
    });
  }

  protected onSearch(event: Event): void {
    const value = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.query.set(value);
    this.searchDebounced(value.trim());
  }

  protected previous(): void {
    this.skip.update((value) => Math.max(0, value - PAGE_SIZE));
  }

  protected next(): void {
    const page = this.page();
    if (page === null || page.skip + PAGE_SIZE >= page.total) return;
    this.skip.update((value) => value + PAGE_SIZE);
  }

  protected go(skip: number): void {
    this.skip.set(skip);
  }

  protected retry(): void {
    this.reload.update((value) => value + 1);
  }

  protected remember(product: Product): void {
    this.created = product;
  }

  protected finish(): void {
    this.creating.set(false);
    const product = this.created;
    this.created = null;
    if (product !== null) void this.reveal(product);
  }

  private async reveal(product: Product): Promise<void> {
    this.searchDebounced.cancel();
    this.query.set('');
    this.debouncedQuery.set('');
    try {
      const first = await this.api.search({ skip: 0, limit: PAGE_SIZE });
      const nextSkip = skipForProduct(first, product.id, PAGE_SIZE);
      if (nextSkip === this.skip()) this.reload.update((value) => value + 1);
      else this.skip.set(nextSkip);
    } catch (error) {
      this.state.set({ status: 'error', message: toCatalogError(error).message });
    }
  }

  private async load(skip: number, query: string): Promise<void> {
    const id = ++this.requestId;
    this.state.set({ status: 'loading' });
    try {
      const page = await this.api.search({ skip, limit: PAGE_SIZE, q: query });
      if (id !== this.requestId) return;
      if (page.products.length === 0 && skip > 0 && page.total > 0) {
        const lastPage = Math.floor((page.total - 1) / PAGE_SIZE) * PAGE_SIZE;
        if (lastPage !== skip) {
          this.skip.set(lastPage);
          return;
        }
      }
      this.state.set({ status: 'ready', page });
    } catch (error) {
      if (id !== this.requestId) return;
      this.state.set({ status: 'error', message: toCatalogError(error).message });
    }
  }
}
