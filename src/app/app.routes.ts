import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/angular-table/angular-table.component').then(
        (m) => m.AngularTableComponent
      ),
  },
  {
    path: 'angular-native',
    loadComponent: () =>
      import('./pages/angular-native/angular-native.component').then(
        (m) => m.AngularNativeComponent
      ),
  },
  {
    path: 'test-native',
    loadComponent: () =>
      import('./pages/test-native/test-native.component').then(
        (m) => m.TestNativeComponent
      ),
  },
  { path: '**', redirectTo: '' },
];
