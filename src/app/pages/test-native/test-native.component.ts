import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-native',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test-native.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TestNativeComponent implements OnInit {
  columns = ['Index', 'Name', 'Brand', 'Price'];
  columnsStr = 'Index,Name,Brand,Price';

  product = {
    Index: '1',
    Name: 'test Product',
    Brand: 'test Brand',
    Price: '100',
  };

  ngOnInit() {
    // Explicitly import the design system to ensure it's loaded in this test
    import('portfolio-design-system' as any).catch((e) => console.error(e));
  }
}
