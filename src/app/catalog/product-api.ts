import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import { CatalogError, type ApiIssue } from './catalog-error';
import type { ProductWriteBody } from './product-form';
import { readProduct, readSearchPage } from './product-json';
import type { Product, SearchPage } from './product';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://127.0.0.1:3000',
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readApiMessage(raw: unknown): string | null {
  if (!isRecord(raw) || typeof raw['message'] !== 'string') return null;
  return raw['message'];
}

function readApiIssues(raw: unknown): readonly ApiIssue[] {
  if (!isRecord(raw) || !Array.isArray(raw['issues'])) return [];
  const issues: ApiIssue[] = [];
  for (const issue of raw['issues']) {
    if (!isRecord(issue)) continue;
    if (typeof issue['path'] !== 'string' || typeof issue['message'] !== 'string') continue;
    issues.push({ path: issue['path'], message: issue['message'] });
  }
  return issues;
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 0:
      return 'The catalog could not be reached.';
    case 404:
      return 'Product not found';
    default:
      return 'The catalog request failed.';
  }
}

export function toCatalogError(error: unknown): CatalogError {
  if (error instanceof CatalogError) return error;
  if (error instanceof HttpErrorResponse) {
    return new CatalogError(
      error.status,
      readApiMessage(error.error) ?? fallbackMessage(error.status),
      readApiIssues(error.error),
    );
  }
  return new CatalogError(0, 'The catalog could not be reached.');
}

@Injectable({ providedIn: 'root' })
export class ProductApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  search(query: { skip: number; limit: number; q?: string }): Promise<SearchPage> {
    let params = new HttpParams().set('limit', String(query.limit)).set('skip', String(query.skip));
    const text = query.q?.trim() ?? '';
    if (text !== '') params = params.set('q', text);
    return this.request(
      this.http.get<unknown>(`${this.baseUrl}/products/search`, { params }),
      readSearchPage,
    );
  }

  get(id: number): Promise<Product> {
    return this.request(this.http.get<unknown>(`${this.baseUrl}/products/${id}`), readProduct);
  }

  add(body: ProductWriteBody): Promise<Product> {
    return this.request(this.http.post<unknown>(`${this.baseUrl}/products/add`, body), readProduct);
  }

  update(id: number, body: ProductWriteBody): Promise<Product> {
    return this.request(
      this.http.put<unknown>(`${this.baseUrl}/products/${id}`, body),
      readProduct,
    );
  }

  async remove(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/products/${id}`));
    } catch (error) {
      throw toCatalogError(error);
    }
  }

  private async request<T>(source: Observable<unknown>, read: (raw: unknown) => T): Promise<T> {
    try {
      return read(await firstValueFrom(source));
    } catch (error) {
      throw toCatalogError(error);
    }
  }
}
