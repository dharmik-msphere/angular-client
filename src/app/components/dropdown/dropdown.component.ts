import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dropdown-wrapper">
      @if (label()) {
        <label class="dropdown-label">{{ label() }}</label>
      }
      <div
        class="dropdown-trigger"
        [class.open]="isOpen()"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        tabindex="0"
        (keydown.enter)="toggle()"
        (keydown.space)="toggle()"
      >
        <span class="dropdown-value" [class.placeholder]="!value()">
          {{ selectedLabel() }}
        </span>
        <svg class="dropdown-chevron" [class.rotated]="isOpen()"
          xmlns="http://www.w3.org/2000/svg" width="12" height="12"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>

      @if (isOpen()) {
        <div class="dropdown-menu" role="listbox">
          @for (opt of options(); track opt.value) {
            <div
              class="dropdown-item"
              [class.selected]="opt.value === value()"
              (click)="select(opt.value)"
              role="option"
              [attr.aria-selected]="opt.value === value()"
            >
              @if (opt.value === value()) {
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              } @else {
                <span style="width:12px; display:inline-block;"></span>
              }
              {{ opt.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dropdown-wrapper { position: relative; width: 100%; display: flex; flex-direction: column; gap: 6px; }
    .dropdown-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.07em;
      text-transform: uppercase; color: rgba(255,255,255,0.45);
    }
    .dropdown-trigger {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 9px; padding: 10px 12px;
      cursor: pointer; transition: all 0.2s ease; outline: none;
    }
    .dropdown-trigger:hover, .dropdown-trigger:focus {
      border-color: rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.06);
    }
    .dropdown-trigger.open {
      border-color: rgba(99,102,241,0.6);
      background: rgba(99,102,241,0.06);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }
    .dropdown-value { font-size: 13px; color: #f8fafc; flex: 1; }
    .dropdown-value.placeholder { color: rgba(255,255,255,0.3); }
    .dropdown-chevron { color: rgba(255,255,255,0.4); flex-shrink: 0; transition: transform 0.2s ease; }
    .dropdown-chevron.rotated { transform: rotate(180deg); }
    .dropdown-menu {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;
      background: #1a2235; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px; padding: 4px; overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
    .dropdown-item {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 12px; border-radius: 7px; cursor: pointer;
      font-size: 13px; color: rgba(255,255,255,0.7);
      transition: all 0.15s ease;
    }
    .dropdown-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .dropdown-item.selected {
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
    }
    .dropdown-item svg { flex-shrink: 0; color: #818cf8; }
  `],
})
export class DropdownComponent {
  label       = input<string>('');
  placeholder = input<string>('Select...');
  value       = input<string>('');
  options     = input<DropdownOption[]>([]);

  valueChange = output<string>();
  isOpen      = signal(false);

  private el = inject(ElementRef);

  selectedLabel = computed(() => {
    const opt = this.options().find((o) => o.value === this.value());
    return opt ? opt.label : this.placeholder();
  });

  toggle(): void { this.isOpen.update((v) => !v); }

  select(val: string): void {
    this.valueChange.emit(val);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
