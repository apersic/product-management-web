import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toCatalogError, ProductApi } from '../../catalog/product-api';
import { formatPrice, parseRouteId } from '../../catalog/catalog-page';
import { categoryLabel, type Product } from '../../catalog/product';
import { thumbnailSrc } from '../../catalog/thumbnail';
import { ConfirmModal } from '../../ui/confirm-modal/confirm-modal';
import { ProductFormModal } from '../../ui/product-form-modal/product-form-modal';
import { ToastService } from '../../services/toast.service';

type DetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'missing' }
  | { readonly status: 'error'; readonly message: string }
  | { readonly status: 'ready'; readonly product: Product };

@Component({
  selector: 'app-product-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProductFormModal, ConfirmModal],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail {
  readonly id = input.required<string>();

  private readonly api = inject(ProductApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private requestId = 0;

  private savedProduct: Product | null = null;
  private deleteRequested = false;
  protected readonly editing = signal(false);
  protected readonly confirming = signal(false);
  protected readonly state = signal<DetailState>({ status: 'loading' });
  protected readonly thumbnailSrc = thumbnailSrc;
  protected readonly formatPrice = formatPrice;
  protected readonly categoryLabel = categoryLabel;

  protected readonly parsedId = computed(() => parseRouteId(this.id()));

  protected readonly product = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.product : null;
  });

  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.message : null;
  });

  constructor() {
    effect(() => {
      const id = this.parsedId();
      if (id === null || !isPlatformBrowser(this.platformId)) return;
      void this.load(id);
    });
  }

  protected retry(): void {
    const id = this.parsedId();
    if (id === null) {
      this.state.set({ status: 'missing' });
      return;
    }
    void this.load(id);
  }

  protected remember(product: Product): void {
    this.savedProduct = product;
  }

  protected finish(): void {
    this.editing.set(false);
    const product = this.savedProduct;
    this.savedProduct = null;
    if (product !== null) this.state.set({ status: 'ready', product });
  }

  protected askDelete(): void {
    this.deleteRequested = false;
    this.confirming.set(true);
  }

  protected rememberDelete(): void {
    this.deleteRequested = true;
  }

  protected finishDelete(): void {
    this.confirming.set(false);
    const requested = this.deleteRequested;
    this.deleteRequested = false;
    if (requested) void this.remove();
  }

  private async remove(): Promise<void> {
    const product = this.product();
    if (product === null) return;
    try {
      await this.api.remove(product.id);
      this.toasts.success('Product deleted');
      await this.router.navigate(['/']);
    } catch (error) {
      this.toasts.error(toCatalogError(error).message);
    }
  }

  private async load(id: number): Promise<void> {
    const requestId = ++this.requestId;
    this.state.set({ status: 'loading' });
    try {
      const product = await this.api.get(id);
      if (requestId !== this.requestId) return;
      this.state.set({ status: 'ready', product });
    } catch (error) {
      if (requestId !== this.requestId) return;
      const failure = toCatalogError(error);
      if (failure.status === 404) {
        this.state.set({ status: 'missing' });
        return;
      }
      this.state.set({ status: 'error', message: failure.message });
    }
  }
}
