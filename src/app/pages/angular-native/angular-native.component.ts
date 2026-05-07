import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  effect,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  BenchmarkPanelComponent,
  BenchmarkMetrics,
} from '../../components/benchmark-panel/benchmark-panel.component';
import { ProductsService, Product } from '../../services/products.service';
import { registerMCPTool } from 'portfolio-design-system';

const COLUMNS = ['Index', 'Name', 'Brand', 'Price', 'Availability'];
const COLUMNS_STR = COLUMNS.join(',');

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'limited_stock', label: 'Limited Stock' },
  { value: 'backorder', label: 'Backorder' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'pre_order', label: 'Pre-Order' },
];

const EMPTY_METRICS: BenchmarkMetrics = {
  load: null,
  render: null,
  hydration: null,
  interactive: null,
  total: null,
  rowCount: 10,
  runs: 0,
};

declare const window: Window & { __APP_START__?: number };

@Component({
  selector: 'app-angular-native',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './angular-native.component.html',
  styleUrl: './angular-native.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CommonModule, FormsModule, BenchmarkPanelComponent],
})
export class AngularNativeComponent implements OnInit, OnDestroy {
  private productsService = inject(ProductsService);
  private platformId = inject(PLATFORM_ID);
  private hostEl = inject(ElementRef);

  // ── State signals ────────────────────────────────────────────────
  products = signal<Product[]>([]);
  loading = signal(true);
  page = signal(1);
  limit = signal(10000);
  totalCount = signal(0);
  searchQuery = signal('');
  availability = signal('');

  metrics = signal<BenchmarkMetrics>(EMPTY_METRICS);
  isRunning = signal(false);

  // ── Instrumentation state ────────────────────────────────────────
  private dataArrivedTime = 0;
  private isInitialLoad = true;
  private hydrationTime: number | null = null;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Computed ─────────────────────────────────────────────────────
  columns = COLUMNS;
  columnsStr = COLUMNS_STR;
  availabilityOptions = AVAILABILITY_OPTIONS;

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.limit())));
  pageInfoStart = computed(() => (this.page() - 1) * this.limit() + 1);
  pageInfoEnd = computed(() => Math.min(this.page() * this.limit(), this.totalCount()));

  private loadingTracker = computed(() => this.loading());

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const appStart = window.__APP_START__ ?? performance.now();
      this.hydrationTime = performance.now() - appStart;
    }

    effect(() => {
      this.loadingTracker();

      if (!this.loading()) {
        this.dataArrivedTime = performance.now();

        requestAnimationFrame(() => {
          const renderEnd = performance.now();
          const renderTime = renderEnd - this.dataArrivedTime;

          requestAnimationFrame(() => {
            const interactiveEnd = performance.now();
            const interactiveTime = interactiveEnd - renderEnd;

            const hydration = this.isInitialLoad ? this.hydrationTime : null;
            const total = renderTime + interactiveTime + (hydration ?? 0);

            this.metrics.update((m) => ({
              ...m,
              render: renderTime,
              hydration,
              interactive: interactiveTime,
              total,
              rowCount: this.limit(),
              runs: m.runs + 1,
            }));

            this.isInitialLoad = false;
            this.isRunning.set(false);
          });
        });
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      import('portfolio-design-system' as any).catch((e) =>
        console.error('Failed to load portfolio-design-system', e),
      );

      const capturePageLoad = () => {
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (entries.length > 0) {
          const nav = entries[0];
          const pageLoadTime = nav.domComplete - nav.startTime;

          this.metrics.update((m) => ({
            ...m,
            load: pageLoadTime,
          }));
        }
      };

      if (document.readyState === 'complete') {
        capturePageLoad();
      } else {
        window.addEventListener('load', capturePageLoad, { once: true });
      }
    }

    this.fetchProducts();
    this.registerPageTools();
  }

  private registerPageTools(): void {
    // 1. Search Tool
    registerMCPTool({
      name: 'search_products',
      description: 'Search for products by name or brand in the table',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      execute: async (args) => {
        this.onSearchChange(args['query'] as string);
        return `Searching for: ${args['query']}`;
      },
    });

    // 2. Filter Tool
    registerMCPTool({
      name: 'filter_by_availability',
      description: 'Filter products by their availability status',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: this.availabilityOptions.map((o) => o.value).filter(Boolean),
          },
        },
        required: ['status'],
      },
      execute: async (args) => {
        this.onAvailabilityChange(args['status'] as string);
        return `Filter applied: ${args['status']}`;
      },
    });

    // 3. Delete Tool
    registerMCPTool({
      name: 'delete_product',
      description: 'Delete a product from the table by its Index',
      inputSchema: {
        type: 'object',
        properties: { index: { type: 'string' } },
        required: ['index'],
      },
      execute: async (args) => {
        await this.onDelete(args['index'] as string);
        return `Deleted product with index: ${args['index']}`;
      },
    });

    // 4. Data Context Tool
    registerMCPTool({
      name: 'get_active_products',
      description: 'Returns the current list of products visible in the table',
      execute: async () => {
        return {
          count: this.products().length,
          total: this.totalCount(),
          products: this.products().slice(0, 10), // Limit return size for efficiency
          message: 'Showing first 10 active products',
        };
      },
    });

    // 5. Pagination Tools
    registerMCPTool({
      name: 'next_page',
      description: 'Move to the next page of products',
      execute: async () => {
        this.onNextPage();
        return `Moved to page ${this.page()}`;
      },
    });

    registerMCPTool({
      name: 'prev_page',
      description: 'Move to the previous page of products',
      execute: async () => {
        this.onPrevPage();
        return `Moved to page ${this.page()}`;
      },
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  private async fetchProducts(): Promise<void> {
    this.loading.set(true);
    this.isRunning.set(true);

    const filterStr = this.availability() ? `Availability = ${this.availability()}` : '';

    const data = await this.productsService.getProducts(
      this.page(),
      this.limit(),
      this.searchQuery(),
      filterStr,
    );

    this.products.set(data.products);
    this.totalCount.set(data.totalCount);
    this.loading.set(false);
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val || '');
    this.page.set(1);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.fetchProducts(), 300);
  }

  getSearchEventValue(e: Event): string {
    return (e as any).detail?.value !== undefined
      ? (e as any).detail.value
      : (e.target as HTMLInputElement)?.value;
  }

  onAvailabilityChange(val: string): void {
    this.availability.set(val || '');
    this.page.set(1);
    this.fetchProducts();
  }

  onClearFilters(): void {
    this.searchQuery.set('');
    this.availability.set('');
    this.page.set(1);
    this.fetchProducts();
  }

  onPrevPage(): void {
    if (this.page() <= 1 || this.loading()) return;
    this.page.update((p) => p - 1);
    this.fetchProducts();
  }

  onNextPage(): void {
    if (this.page() * this.limit() >= this.totalCount() || this.loading()) return;
    this.page.update((p) => p + 1);
    this.fetchProducts();
  }

  onLimitChange(n: number): void {
    this.limit.set(n);
    this.page.set(1);
    this.fetchProducts();
  }

  async onDelete(id: string): Promise<void> {
    const ok = await this.productsService.deleteProduct(id);
    if (ok) this.fetchProducts();
  }

  onRunBenchmark(): void {
    this.fetchProducts();
  }

  trackById(_: number, item: Product): string {
    return item['Index'];
  }
}
