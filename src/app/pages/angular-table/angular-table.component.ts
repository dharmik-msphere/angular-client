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
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonComponent } from '../../components/button/button.component';
import { InputComponent } from '../../components/input/input.component';
import { DropdownComponent, DropdownOption } from '../../components/dropdown/dropdown.component';
import { TableRowComponent } from '../../components/table-row/table-row.component';
import {
  BenchmarkPanelComponent,
  BenchmarkMetrics,
} from '../../components/benchmark-panel/benchmark-panel.component';
import { ProductsService, Product } from '../../services/products.service';

const COLUMNS = ['Index', 'Name', 'Brand', 'Price', 'Availability'];

const AVAILABILITY_OPTIONS: DropdownOption[] = [
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
  selector: 'app-angular-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './angular-table.component.html',
  styleUrl: './angular-table.component.css',
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    InputComponent,
    DropdownComponent,
    TableRowComponent,
    BenchmarkPanelComponent,
  ],
})
export class AngularTableComponent implements OnInit, OnDestroy {
  private productsService = inject(ProductsService);
  private platformId = inject(PLATFORM_ID);

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
  private hydrationTime: number | null = null;  // Capture actual hydration time
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Computed ─────────────────────────────────────────────────────
  columns = COLUMNS;
  availabilityOptions = AVAILABILITY_OPTIONS;

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.limit())));
  pageInfoStart = computed(() => (this.page() - 1) * this.limit() + 1);
  pageInfoEnd = computed(() => Math.min(this.page() * this.limit(), this.totalCount()));

  private loadingTracker = computed(() => this.loading());

  constructor() {
    // Capture hydration time immediately (time from app start to component init)
    if (isPlatformBrowser(this.platformId)) {
      const appStart = window.__APP_START__ ?? performance.now();
      this.hydrationTime = performance.now() - appStart;
    }

    // ── Effect: Triggered when data arrives and DOM updates ──
    effect(() => {
      this.loadingTracker();

      // When loading completes (data arrived + signals updated)
      if (!this.loading()) {
        // Mark when data arrived (just before rendering starts)
        this.dataArrivedTime = performance.now();

        // First RAF: End of Render (framework processed data and committed to DOM)
        requestAnimationFrame(() => {
          const renderEnd = performance.now();
          const renderTime = renderEnd - this.dataArrivedTime;

          // Second RAF: End of Interactive (browser painted pixels and is interactive)
          requestAnimationFrame(() => {
            const interactiveEnd = performance.now();
            const interactiveTime = interactiveEnd - renderEnd;

            // Use hydration time only on initial load, null on subsequent loads
            const hydration = this.isInitialLoad ? this.hydrationTime : null;

            // Total = Render + Hydration + Interactive
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
    if (!isPlatformBrowser(this.platformId)) return;

    // ── Page Load Time (Navigation Timing API) ──
    // Only captured once at app startup
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

    // Initial data fetch
    this.fetchProducts();
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  // ── Data fetching ────────────────────────────────────────────────
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

    // Update signals to trigger effect (benchmarking starts here)
    this.products.set(data.products);
    this.totalCount.set(data.totalCount);
    this.loading.set(false);
  }

  // ── Event handlers ───────────────────────────────────────────────
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.page.set(1);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.fetchProducts(), 300);
  }

  onAvailabilityChange(val: string): void {
    this.availability.set(val);
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
