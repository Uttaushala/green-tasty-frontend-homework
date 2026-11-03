import { PricePipe } from '@app/shared/pipes/price.pipe';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Participant } from '@app/models/group-orders/participant.model';

@Component({
  selector: 'app-participant-card',
  imports: [PricePipe],
  templateUrl: './participant-card.component.html',
  styleUrl: './participant-card.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ParticipantCardComponent {
  readonly participant = input.required<Participant>();
  /** Власна картка Owner (id збігається з guestSessionId) — підписується «My Pre-Order». */
  readonly isMe = input(false);
  /** Показувати посилання «Remove Guest» (лише для гостей і лише поки група Open). */
  readonly canRemove = input(false);

  /** Показувати «Remind» — лише для гостя, який ще обирає страви, поки група Open. */
  readonly canRemind = input(false);
  /** Нагадування цьому гостю щойно відправляється. */
  readonly reminding = input(false);

  /** Owner's own card: "Edit my Pre-Order" link. */
  readonly canEdit = input(false);
  /** Figma: while the group is still collecting, "My Pre-Order" rows get a trash icon and a +/- stepper
   * instead of plain "Qty: n" text. Only ever true for the owner's own card — guests edit their own cart. */
  readonly canEditItems = input(false);
  /** Dish id with a quantity/remove request in flight — its row's controls disable while it resolves. */
  readonly mutatingDishId = input<string | null>(null);

  readonly editClick = output<void>();
  readonly removeClick = output<Participant>();
  readonly remindClick = output<Participant>();
  readonly itemQuantityChange = output<{ dishId: string; quantity: number }>();
  readonly itemRemove = output<string>();

  readonly title = computed(() => {
    const person = this.participant();
    if (this.isMe()) {
      return 'My Pre-Order';
    }
    return person.type === 'Owner' ? `Owner: ${person.name}` : `Guest: ${person.name}`;
  });
}
