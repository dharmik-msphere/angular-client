import {
  Component,
  ChangeDetectionStrategy,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: '[app-table-row]',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (col of columns(); track col) {
      <td class="table-cell">
        {{ rowData()[col] ? rowData()[col] : '—' }}
      </td>
    }
    <td class="table-cell table-cell-actions">
      <ng-content />
    </td>
  `,
  styles: [`
    :host { display: table-row; }
    :host:hover td { background: rgba(255,255,255,0.03); }
    .table-cell {
      padding: 11px 16px;
      font-size: 13px;
      color: rgba(255,255,255,0.75);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
      transition: background 0.15s ease;
    }
    .table-cell-actions {
      text-align: right;
      white-space: nowrap;
      max-width: none;
      overflow: visible;
    }
  `],
})
export class TableRowComponent {
  columns = input<string[]>([]);
  rowData = input<Record<string, string>>({});
  rowId   = input<string>('');
}
