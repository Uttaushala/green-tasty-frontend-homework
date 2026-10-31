import {
  ChangeDetectionStrategy,
  Component,
  output,
} from '@angular/core';

import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';

@Component({
  selector: 'app-submit-order-modal',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './submit-order-modal.component.html',
  styleUrl: './submit-order-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmitOrderModalComponent {
  readonly viewReservations = output<void>();
  readonly closed = output<void>();

  closeModal(): void {
    this.closed.emit();
  }
}
