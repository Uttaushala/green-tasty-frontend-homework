import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export interface ToastData {
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-content">
      @if (data.type === 'success') {
        <img src="assets/svg/check-circle.svg" alt="" class="toast-icon" />
      }
      <div class="toast-text">
        @if (data.title && data.type !== 'success') {
          <strong class="toast-title">{{ data.title }}</strong>
        }
        <span class="toast-message" [class.toast-message--success]="data.type === 'success'">{{ data.message }}</span>
      </div>
    </div>
    <button type="button" class="toast-close" aria-label="Close" (click)="snackBarRef.dismiss()">
      <img src="assets/svg/close.svg" alt="" width="24" height="24" />
    </button>
  `,
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  data = inject<ToastData>(MAT_SNACK_BAR_DATA);
  snackBarRef = inject(MatSnackBarRef);
}
