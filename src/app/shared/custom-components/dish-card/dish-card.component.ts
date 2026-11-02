import { PricePipe } from '../../pipes/price.pipe';
import {Component, ChangeDetectionStrategy, input, output, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DishListResponse } from '@app/models/dishes/dish-list-response.model';
import { DishState } from '@app/models/enums/dish-state.model';
import {CustomButtonComponent} from '@app/shared/custom-components/custom-button/custom-button.component';

function normalizeState(state: string | null | undefined): string {
  return (state ?? '').toLowerCase().replace(/[^a-z]/g, '');
}

@Component({
  selector: 'app-dish-card',
  templateUrl: './dish-card.component.html',
  styleUrls: ['./dish-card.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CommonModule, CustomButtonComponent, PricePipe],
})
export class DishCardComponent {
  readonly dish = input.required<DishListResponse>();
  readonly maxWidth = input('');
  readonly preOrderEnabled = input(false);

  readonly dishClicked = output<void>();
  readonly preOrderClicked = output<void>();

  readonly dishStateLabel = computed(() => {
    return this.isUnavailable() ? 'Sold Out' : this.dish().state;
  });

  // The API spells states with spaces ("Out of stock", "On stop"); compare letters only.
  readonly isUnavailable = computed(() => {
    const state = normalizeState(this.dish().state);

    return state === normalizeState(DishState.OnStop) || state === normalizeState(DishState.OutOfStock);
  });

  onCardClicked(): void {
    if (!this.isUnavailable()) {
      this.dishClicked.emit();
    }
  }

  onPreOrderClicked(event: Event): void {
    // The button lives inside the clickable card: do not open the full view as well.
    event.stopPropagation();
    this.preOrderClicked.emit();
  }
}
