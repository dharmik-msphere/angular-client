import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface BenchmarkMetrics {
  load: number | null;        // page load — independent, NOT in total
  render: number | null;      // time to commit DOM
  hydration: number | null;   // Angular bootstrap / hydration (one-time)
  interactive: number | null; // rAF paint time
  total: number | null;       // render + hydration + interactive
  rowCount: number;
  runs: number;
}

@Component({
  selector: 'app-benchmark-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" [style.--accent]="accentColor()" [style.--accent-bg]="accentBg()" [style.--accent-border]="accentBorder()">
      <!-- Glow orb -->
      <div class="glow-orb"></div>

      <!-- Header row -->
      <div class="panel-header">
        <div class="panel-title-group">
          <div class="panel-title-row">
            <span class="status-dot"
              [style.background]="hasResults() ? accentColor() : isRunning() ? '#fbbf24' : 'rgba(255,255,255,0.2)'"
              [style.box-shadow]="hasResults() ? 'inset 0 0 0 2px ' + accentColor() : isRunning() ? 'inset 0 0 0 2px #fbbf24' : 'none'"
              [class.pulsing]="isRunning()">
            </span>
            <span class="panel-badge">⚡ Benchmark Panel</span>
            @if (strategyBadge()) {
              <span class="strategy-badge">{{ strategyBadge() }}</span>
            }
          </div>
          <h2 class="panel-track-name">{{ trackName() }}</h2>
          <p class="panel-description">{{ trackDescription() }}</p>
        </div>

        <!-- Total badge -->
        @if (hasResults()) {
          <div class="total-badge">
            <div class="total-badge-label">Total Time</div>
            <div class="total-badge-value">{{ metrics().total!.toFixed(2) }}</div>
            <div class="total-badge-sub">ms · {{ metrics().rowCount }} rows · run #{{ metrics().runs }}</div>
          </div>
        }
      </div>

      <!-- Metric cards grid -->
      <div class="metrics-grid">
        <!-- Page Load (independent) -->
        <div class="metric-card" [class.active]="metrics().load !== null">
          @if (metrics().load !== null) { <div class="metric-top-bar"></div> }
          <span class="metric-label">Page Load</span>
          <div class="metric-value-row">
            <span class="metric-value">{{ metrics().load !== null ? metrics().load!.toFixed(2) : '—' }}</span>
            @if (metrics().load !== null) { <span class="metric-unit">ms</span> }
          </div>
          <span class="metric-desc">Navigation start → DOM complete (independent)</span>
        </div>

        <!-- Render -->
        <div class="metric-card" [class.active]="metrics().render !== null">
          @if (metrics().render !== null) { <div class="metric-top-bar"></div> }
          <span class="metric-label">Render</span>
          <div class="metric-value-row">
            <span class="metric-value">{{ metrics().render !== null ? metrics().render!.toFixed(2) : '—' }}</span>
            @if (metrics().render !== null) { <span class="metric-unit">ms</span> }
          </div>
          <span class="metric-desc">Signal set → afterRender DOM commit</span>
        </div>

        <!-- Hydration -->
        <div class="metric-card" [class.active]="metrics().hydration !== null">
          @if (metrics().hydration !== null) { <div class="metric-top-bar"></div> }
          <span class="metric-label">Hydration</span>
          <div class="metric-value-row">
            <span class="metric-value">{{ metrics().hydration !== null ? metrics().hydration!.toFixed(2) : '—' }}</span>
            @if (metrics().hydration !== null) { <span class="metric-unit">ms</span> }
          </div>
          <span class="metric-desc">Angular SSR bootstrap to client-ready (once)</span>
        </div>

        <!-- Interactive -->
        <div class="metric-card" [class.active]="metrics().interactive !== null">
          @if (metrics().interactive !== null) { <div class="metric-top-bar"></div> }
          <span class="metric-label">Interactive</span>
          <div class="metric-value-row">
            <span class="metric-value">{{ metrics().interactive !== null ? metrics().interactive!.toFixed(2) : '—' }}</span>
            @if (metrics().interactive !== null) { <span class="metric-unit">ms</span> }
          </div>
          <span class="metric-desc">First rAF after DOM commit (paint ready)</span>
        </div>
      </div>

      <!-- Breakdown bar -->
      @if (hasResults()) {
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar">
            <div class="breakdown-segment seg-render"  [style.width]="renderPct()  + '%'" title="Render"></div>
            <div class="breakdown-segment seg-hydrate" [style.width]="hydratePct() + '%'" title="Hydration"></div>
            <div class="breakdown-segment seg-paint"   [style.width]="paintPct()   + '%'" title="Interactive"></div>
          </div>
          <div class="breakdown-labels">
            <span class="breakdown-pct"><span class="dot dot-render"></span>Render {{ renderPct() }}%</span>
            <span class="breakdown-pct"><span class="dot dot-hydrate"></span>Hydration {{ hydratePct() }}%</span>
            <span class="breakdown-pct"><span class="dot dot-paint"></span>Interactive {{ paintPct() }}%</span>
          </div>
        </div>
      }

      <!-- Controls -->
      <div class="panel-controls">
        <div class="row-count-input">
          <label class="row-count-label" for="bp-row-count">Rows to render:</label>
          <input
            id="bp-row-count"
            type="number"
            class="row-count-field"
            [value]="rowCount()"
            min="10" max="2000000" step="10"
            (change)="onRowCountChange($event)"
          />
        </div>

        <button
          id="run-benchmark-btn"
          class="run-btn"
          [class.running]="isRunning()"
          [disabled]="isRunning()"
          (click)="runBenchmark.emit()"
          type="button"
        >
          @if (isRunning()) {
            <span class="spinner"></span>
            Running…
          } @else {
            ▶ Run Benchmark
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .panel {
      background: linear-gradient(135deg, #0a1628 0%, #111827 100%);
      border: 1px solid var(--accent-border, rgba(99,102,241,0.25));
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 32px;
      box-shadow: 0 0 60px color-mix(in srgb, var(--accent, #6366f1) 10%, transparent),
                  0 4px 24px rgba(0,0,0,0.5);
      font-family: 'Inter', system-ui, sans-serif;
      position: relative;
      overflow: hidden;
    }
    .glow-orb {
      position: absolute; top: -80px; right: -80px;
      width: 280px; height: 280px; border-radius: 50%;
      background: radial-gradient(circle, color-mix(in srgb, var(--accent, #6366f1) 18%, transparent) 0%, transparent 70%);
      pointer-events: none;
    }
    /* Header */
    .panel-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .panel-title-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
    .panel-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .status-dot {
      width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
      transition: all 0.3s ease;
    }
    .status-dot.pulsing { animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
    .panel-badge {
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--accent, #6366f1);
    }
    .strategy-badge {
      font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
      color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.06);
      padding: 2px 9px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1);
    }
    .panel-track-name { font-size: 20px; font-weight: 700; color: #f8fafc; }
    .panel-description { font-size: 12px; color: rgba(255,255,255,0.4); max-width: 520px; line-height: 1.5; }
    /* Total badge */
    .total-badge {
      background: var(--accent-bg, rgba(99,102,241,0.08));
      border: 1px solid var(--accent-border, rgba(99,102,241,0.3));
      border-radius: 14px; padding: 14px 22px; text-align: center; min-width: 130px;
    }
    .total-badge-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--accent, #6366f1); margin-bottom: 4px;
    }
    .total-badge-value {
      font-size: 34px; font-weight: 900; color: #f8fafc;
      font-variant-numeric: tabular-nums; line-height: 1;
    }
    .total-badge-sub { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 4px; }
    /* Metric cards */
    .metrics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr));
      gap: 12px; margin-bottom: 18px;
    }
    .metric-card {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 6px;
      transition: all 0.3s ease; position: relative; overflow: hidden;
    }
    .metric-card.active {
      background: var(--accent-bg, rgba(99,102,241,0.07));
      border-color: color-mix(in srgb, var(--accent, #6366f1) 30%, transparent);
    }
    .metric-top-bar {
      position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, var(--accent, #6366f1), color-mix(in srgb, var(--accent, #6366f1) 50%, transparent));
    }
    .metric-label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--accent, rgba(255,255,255,0.35));
    }
    .metric-card:not(.active) .metric-label { color: rgba(255,255,255,0.3); }
    .metric-value-row { display: flex; align-items: baseline; gap: 4px; }
    .metric-value {
      font-size: 28px; font-weight: 800; color: #f8fafc;
      font-variant-numeric: tabular-nums; line-height: 1; transition: all 0.3s ease;
    }
    .metric-card:not(.active) .metric-value { color: rgba(255,255,255,0.15); }
    .metric-unit { font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 500; }
    .metric-desc { font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.4; }
    /* Breakdown bar */
    .breakdown-bar-wrap { margin-bottom: 18px; }
    .breakdown-bar {
      height: 5px; border-radius: 3px; overflow: hidden;
      background: rgba(255,255,255,0.06); display: flex; margin-bottom: 8px;
    }
    .breakdown-segment { height: 100%; transition: width 0.5s ease; }
    .seg-render  { background: var(--accent, #6366f1); }
    .seg-hydrate { background: #f59e0b; }
    .seg-paint   { background: #10b981; }
    .breakdown-labels { display: flex; gap: 16px; flex-wrap: wrap; }
    .breakdown-pct {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; color: rgba(255,255,255,0.45);
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .dot-render  { background: var(--accent, #6366f1); }
    .dot-hydrate { background: #f59e0b; }
    .dot-paint   { background: #10b981; }
    /* Controls */
    .panel-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .row-count-input {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 9px; padding: 8px 14px;
    }
    .row-count-label { font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 600; white-space: nowrap; }
    .row-count-field {
      background: transparent; border: none; outline: none;
      color: #f8fafc; font-size: 14px; font-weight: 700;
      width: 90px; font-variant-numeric: tabular-nums; font-family: inherit;
    }
    .run-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, var(--accent, #6366f1), color-mix(in srgb, var(--accent, #6366f1) 70%, #7c3aed));
      border: 1px solid var(--accent, #6366f1); border-radius: 10px;
      padding: 10px 24px; color: #fff; font-size: 13px; font-weight: 700;
      letter-spacing: 0.04em; cursor: pointer; transition: all 0.2s ease;
      box-shadow: 0 4px 16px color-mix(in srgb, var(--accent, #6366f1) 40%, transparent);
      font-family: inherit;
    }
    .run-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px color-mix(in srgb, var(--accent, #6366f1) 55%, transparent);
    }
    .run-btn.running, .run-btn:disabled {
      background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.3); cursor: not-allowed; box-shadow: none; transform: none;
    }
    .spinner {
      width: 12px; height: 12px;
      border: 2px solid rgba(255,255,255,0.15);
      border-top-color: rgba(255,255,255,0.55);
      border-radius: 50%; animation: spin 0.7s linear infinite;
      display: inline-block; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class BenchmarkPanelComponent {
  trackName        = input<string>('Benchmark');
  trackDescription = input<string>('');
  accentColor      = input<string>('#6366f1');
  accentBg         = input<string>('rgba(99,102,241,0.08)');
  accentBorder     = input<string>('rgba(99,102,241,0.25)');
  strategyBadge    = input<string>('');
  metrics          = input.required<BenchmarkMetrics>();
  isRunning        = input<boolean>(false);
  rowCount         = input<number>(10);

  rowCountChange = output<number>();
  runBenchmark   = output<void>();

  hasResults = computed(() => this.metrics().total !== null);

  renderPct  = computed(() => this.safePct(this.metrics().render,      this.metrics().total));
  hydratePct = computed(() => this.safePct(this.metrics().hydration,   this.metrics().total));
  paintPct   = computed(() => this.safePct(this.metrics().interactive, this.metrics().total));

  private safePct(val: number | null, total: number | null): string {
    if (val === null || total === null || total === 0) return '0';
    return ((val / total) * 100).toFixed(0);
  }

  onRowCountChange(event: Event): void {
    const val = +(event.target as HTMLInputElement).value;
    this.rowCountChange.emit(Math.max(10, Math.min(2_000_000, val)));
  }
}
