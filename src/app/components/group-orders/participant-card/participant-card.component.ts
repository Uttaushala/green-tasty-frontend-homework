import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Participant } from '@app/models/group-orders/participant.model';

@Component({
  selector: 'app-participant-card',
  imports: [CurrencyPipe],
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

  readonly removeClick = output<Participant>();
  readonly remindClick = output<Participant>();

  readonly title = computed(() => {
    const person = this.participant();
    if (this.isMe()) {
      return 'My Pre-Order';
    }
    return person.type === 'Owner' ? `Owner: ${person.name}` : `Guest: ${person.name}`;
  });
}
