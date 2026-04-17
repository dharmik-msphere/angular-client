import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'outline' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="btn"
      [class.btn-primary]="variant() === 'primary'"
      [class.btn-outline]="variant() === 'outline'"
      [class.btn-destructive]="variant() === 'destructive'"
      [class.btn-ghost]="variant() === 'ghost'"
      [class.btn-sm]="size() === 'sm'"
      [class.btn-md]="size() === 'md'"
      [class.btn-lg]="size() === 'lg'"
      [class.btn-full]="fullWidth()"
      [disabled]="disabled()"
      (click)="onClick($event)"
      type="button"
    >
      <ng-content />
    </button>
  `,
  styles: [`
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      outline: none;
      text-decoration: none;
      -webkit-font-smoothing: antialiased;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
    /* Sizes */
    .btn-sm { padding: 6px 14px; font-size: 12px; letter-spacing: 0.02em; }
    .btn-md { padding: 9px 20px; font-size: 13px; letter-spacing: 0.02em; }
    .btn-lg { padding: 12px 28px; font-size: 14px; letter-spacing: 0.02em; }
    .btn-full { width: 100%; }
    /* Variants */
    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #7c3aed);
      color: #fff;
      border-color: #6366f1;
      box-shadow: 0 4px 16px rgba(99,102,241,0.35);
    }
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f52de, #6d28d9);
      box-shadow: 0 4px 20px rgba(99,102,241,0.5);
      transform: translateY(-1px);
    }
    .btn-primary:active:not(:disabled) { transform: translateY(0); }
    .btn-outline {
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.75);
      border-color: rgba(255,255,255,0.12);
    }
    .btn-outline:hover:not(:disabled) {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.22);
      color: #fff;
    }
    .btn-destructive {
      background: rgba(239,68,68,0.12);
      color: #f87171;
      border-color: rgba(239,68,68,0.3);
    }
    .btn-destructive:hover:not(:disabled) {
      background: rgba(239,68,68,0.22);
      box-shadow: 0 2px 12px rgba(239,68,68,0.3);
    }
    .btn-ghost {
      background: transparent;
      color: rgba(255,255,255,0.6);
      border-color: transparent;
    }
    .btn-ghost:hover:not(:disabled) {
      background: rgba(255,255,255,0.05);
      color: #fff;
    }
  `],
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input<boolean>(false);
  fullWidth = input<boolean>(false);

  clicked = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
