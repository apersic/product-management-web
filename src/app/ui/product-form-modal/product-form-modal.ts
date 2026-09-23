import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, type ValidatorFn } from '@angular/forms';
import { toCatalogError, ProductApi } from '../../catalog/product-api';
import {
  categoryError,
  descriptionError,
  priceError,
  tagsError,
  titleError,
  toProductWriteBody,
  type ProductWriteBody,
} from '../../catalog/product-form';
import { CATEGORY_SLUGS, categoryLabel, isCategorySlug, type Product } from '../../catalog/product';
import { ToastService } from '../../services/toast.service';
import { useClickOutside } from '../../helpers/use-click-outside';

function messageValidator(check: (value: string) => string | null): ValidatorFn {
  return (control) => {
    const value = typeof control.value === 'string' ? control.value : '';
    const message = check(value);
    return message === null ? null : { message };
  };
}

type FieldName = 'title' | 'price' | 'description' | 'category' | 'tags';

@Component({
  selector: 'app-product-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './product-form-modal.html',
  styleUrl: './product-form-modal.css',
})
export class ProductFormModal {
  readonly mode = input.required<'create' | 'edit'>();
  readonly product = input<Product | null>(null);
  readonly saved = output<Product>();
  readonly closed = output<void>();

  private readonly api = inject(ProductApi);
  private readonly toasts = inject(ToastService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private closedOnce = false;

  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [messageValidator(titleError)] }),
    price: new FormControl('', { nonNullable: true, validators: [messageValidator(priceError)] }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [messageValidator(descriptionError)],
    }),
    category: new FormControl('beauty', {
      nonNullable: true,
      validators: [messageValidator(categoryError)],
    }),
    tags: new FormControl('', { nonNullable: true, validators: [messageValidator(tagsError)] }),
  });

  protected readonly categoryOptions = computed(() => {
    const current = this.product()?.category;
    if (current !== undefined && !isCategorySlug(current)) return [current, ...CATEGORY_SLUGS];
    return CATEGORY_SLUGS;
  });

  protected readonly heading = computed(() =>
    this.mode() === 'create' ? 'New product' : 'Edit product',
  );

  constructor() {
    useClickOutside(
      computed(() => this.dialog().nativeElement),
      () => {
        if (!this.saving()) this.cancel();
      },
    );
    effect(() => {
      const product = this.product();
      if (product === null) return;
      this.form.setValue({
        title: product.title,
        price: product.price.toFixed(2),
        description: product.description,
        category: product.category,
        tags: product.tags.join(', '),
      });
    });
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
    });
  }

  protected label(slug: string): string {
    return categoryLabel(slug);
  }

  protected show(field: FieldName): boolean {
    const control = this.form.controls[field];
    return (this.submitted() || control.touched) && control.hasError('message');
  }

  protected message(field: FieldName): string {
    const message = this.form.controls[field].getError('message');
    return typeof message === 'string' ? message : '';
  }

  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const body = toProductWriteBody(this.form.getRawValue());
    if (body === null || this.saving()) return;
    this.saving.set(true);
    try {
      const product = await this.save(body);
      this.toasts.success(this.mode() === 'create' ? 'Product created' : 'Product updated');
      this.saved.emit(product);
      this.dialog().nativeElement.close();
    } catch (error) {
      const failure = toCatalogError(error);
      this.applyIssues(failure.issues);
      if (failure.issues.length === 0) this.toasts.error(failure.message);
    } finally {
      this.saving.set(false);
    }
  }

  protected cancel(): void {
    this.dialog().nativeElement.close();
  }

  protected onClose(): void {
    if (this.closedOnce) return;
    this.closedOnce = true;
    this.closed.emit();
  }

  private async save(body: ProductWriteBody): Promise<Product> {
    const mode = this.mode();
    switch (mode) {
      case 'create':
        return this.api.add(body);
      case 'edit': {
        const existing = this.product();
        if (existing === null) throw new Error('Edit requires a product');
        return this.api.update(existing.id, body);
      }
      default: {
        const exhaustive: never = mode;
        return exhaustive;
      }
    }
  }

  private applyIssues(issues: readonly { path: string; message: string }[]): void {
    for (const issue of issues) {
      const control = this.form.get(issue.path);
      if (control === null) continue;
      control.setErrors({ message: issue.message });
      control.markAsTouched();
    }
  }
}
