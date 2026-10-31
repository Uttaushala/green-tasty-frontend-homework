import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';

@Component({
  selector: 'app-dish-modal',
  standalone: true,
  imports: [CurrencyPipe],
  templateUrl: './dish-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dish-modal.component.scss',
})
export class DishModalComponent {
  @Input() dish!: DishListResponse;
  @Input() preOrderEnabled = false;
  @Output() closed = new EventEmitter<void>();
  @Output() preOrder = new EventEmitter<void>();

  onPreOrder(): void {
    this.preOrder.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}
