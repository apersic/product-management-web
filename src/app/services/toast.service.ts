import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error';

export type ToastItem = {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly items = signal<readonly ToastItem[]>([]);
  readonly toasts = this.items.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  dismiss(id: number): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  private push(kind: ToastKind, message: string): void {
    const id = ++this.nextId;
    this.items.update((items) => [...items, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}
