import { Injectable } from '@angular/core';
import { Meilisearch } from 'meilisearch';

export interface Product {
  Index: string;
  Name: string;
  Description: string;
  Brand: string;
  Category: string;
  Price: string;
  Currency: string;
  Stock: string;
  EAN: string;
  Color: string;
  Size: string;
  Availability: string;
  'Internal ID': string;
  [key: string]: string;
}

export interface ProductsResponse {
  products: Product[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private client = new Meilisearch({
    host: 'http://localhost:7700',
    apiKey: 'masterKey',
  });

  async getProducts(
    page = 1,
    limit = 10,
    query = '',
    filter = ''
  ): Promise<ProductsResponse> {
    try {
      const searchParams: Record<string, unknown> = {
        hitsPerPage: limit,
        page,
      };
      if (filter) searchParams['filter'] = filter;

      const result = await this.client
        .index('products')
        .search((query || '').trim(), searchParams);

      return {
        products: result.hits as unknown as Product[],
        totalCount: (result as any).totalHits   ?? result.estimatedTotalHits ?? 0,
      };
    } catch (err) {
      console.error('MeiliSearch error:', err);
      return { products: [], totalCount: 0 };
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await this.client.index('products').deleteDocument(id);
      return true;
    } catch (err) {
      console.error('Delete error:', err);
      return false;
    }
  }
}
