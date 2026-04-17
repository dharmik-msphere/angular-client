import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="input-wrapper">
      @if (label()) {
        <label [for]="inputId()" class="input-label">{{ label() }}</label>
      }
      <div class="input-inner" [class.focused]="isFocused()">
        @if (icon() === 'search') {
          <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        }
        <input
          [id]="inputId()"
          class="input-field"
          [class.has-icon]="icon()"
          type="text"
          [placeholder]="placeholder()"
          [value]="value()"
          (input)="onInput($event)"
          (focus)="isFocused.set(true)"
          (blur)="isFocused.set(false)"
        />
        @if (value() && clearable()) {
          <button class="input-clear" (click)="clear()" type="button" aria-label="Clear">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .input-wrapper { display: flex; flex-direction: column; gap: 6px; width: 100%; }
    .input-label {
      font-size: 11px; font-weight: 600; letter-spacing: 0.07em;
      text-transform: uppercase; color: rgba(255,255,255,0.45);
    }
    .input-inner {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 9px; padding: 0 12px;
      transition: all 0.2s ease;
    }
    .input-inner.focused {
      border-color: rgba(99,102,241,0.6);
      background: rgba(99,102,241,0.06);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
    }
    .input-icon { color: rgba(255,255,255,0.3); flex-shrink: 0; }
    .focused .input-icon { color: rgba(99,102,241,0.8); }
    .input-field {
      flex: 1; background: transparent; border: none; outline: none;
      color: #f8fafc; font-size: 13px; font-family: inherit; padding: 10px 0;
      min-width: 0;
    }
    .input-field::placeholder { color: rgba(255,255,255,0.25); }
    .input-field.has-icon { padding-left: 0; }
    .input-clear {
      background: none; border: none; cursor: pointer; padding: 2px;
      color: rgba(255,255,255,0.3); border-radius: 4px; flex-shrink: 0;
      display: flex; align-items: center; transition: color 0.2s;
    }
    .input-clear:hover { color: rgba(255,255,255,0.7); }
  `],
})
export class InputComponent {
  label     = input<string>('');
  placeholder = input<string>('');
  value     = input<string>('');
  icon      = input<'search' | ''>('');
  clearable = input<boolean>(true);
  inputId   = input<string>('app-input');

  valueChange = output<string>();
  isFocused   = signal(false);

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }

  clear(): void {
    this.valueChange.emit('');
  }
}
