import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { withUnit } from '@app/shared/mappers/dish-response.mapper';
import { PricePipe } from '@app/shared/pipes/price.pipe';

@Component({
  selector: 'app-dish-modal',
  standalone: true,
  imports: [PricePipe],
  templateUrl: './dish-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dish-modal.component.scss',
})
export class DishModalComponent {
  @Input() dish!: DishListResponse;
  @Input() preOrderEnabled = false;
  @Output() closed = new EventEmitter<void>();
  @Output() preOrder = new EventEmitter<void>();

  get calories(): string {
    return withUnit(this.dish.calories, 'kcal');
  }

  get fats(): string {
    return withUnit(this.dish.fats, 'g');
  }

  onPreOrder(): void {
    this.preOrder.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}
