import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { PreOrderProgress } from '@app/models/group-orders/pre-order-progress.model';
import {
  ReservationCustomer,
  ReservationStatusCustomer,
} from '@app/models/reservations/reservation.model';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { buildPreOrderQueryParams } from '@app/shared/helpers/pre-order-query-params';
import { readSeenGuests } from '@app/shared/helpers/seen-guests';

interface StatusView {
  cssClass: string;
  label: string;
}

const STATUS_VIEWS: Record<number, StatusView> = {
  [ReservationStatusCustomer.Reserved]: { cssClass: 'reserved', label: 'Reserved' },
  [ReservationStatusCustomer.InProgress]: { cssClass: 'in-progress', label: 'In Progress' },
  [ReservationStatusCustomer.Finished]: { cssClass: 'completed', label: 'Completed' },
  [ReservationStatusCustomer.Cancelled]: { cssClass: 'cancelled', label: 'Cancelled' },
};

@Component({
  selector: 'app-customer-reservation-card',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './customer-reservation-card.component.html',
  styleUrl: './customer-reservation-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerReservationCardComponent {
  private readonly router = inject(Router);
  private readonly groupOrdersService = inject(GroupOrdersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly reservation = input.required<ReservationCustomer>();

  readonly cancelReservation = output<string>();
  readonly inviteGuests = output<ReservationCustomer>();
  readonly leaveFeedback = output<ReservationCustomer>();
  readonly updateFeedback = output<ReservationCustomer>();

  readonly progress = signal<PreOrderProgress | null>(null);

  readonly statusView = computed<StatusView>(
    () => STATUS_VIEWS[this.reservation().status] ?? { cssClass: '', label: 'Unknown' },
  );

  readonly isReserved = computed(
    () => this.reservation().status === ReservationStatusCustomer.Reserved,
  );

  readonly isGroup = computed(() => this.reservation().guestCount > 1);

  readonly guestsLabel = computed(() => {
    const count = this.reservation().guestCount;

    return `${count} ${count === 1 ? 'Guest' : 'Guests'}`;
  });

  readonly showInviteRow = computed(() => this.isReserved() && this.isGroup());

  readonly showProgress = computed(
    () => this.isGroup() && this.reservation().status !== ReservationStatusCustomer.Cancelled,
  );

  /** Submitted pre-orders; without a group on the server only the owner's own order can exist. */
  readonly submittedCount = computed(
    () => this.progress()?.submitted ?? (this.reservation().hasSubmittedPreOrder === true ? 1 : 0),
  );

  readonly progressOver = computed(() => this.submittedCount() > this.reservation().guestCount);

  readonly hasNewGuests = computed(() => {
    const current = this.progress();

    return (
      this.isReserved() &&
      current !== null &&
      current.guestsJoined > readSeenGuests(this.reservation().id)
    );
  });

  readonly ownerSubmitted = computed(() => this.reservation().hasSubmittedPreOrder === true);

  /** The owner needs the group window as soon as guests joined, even before their own order is sent. */
  readonly showGroupOrder = computed(
    () => this.isGroup() && (this.ownerSubmitted() || (this.progress()?.guestsJoined ?? 0) > 0),
  );

  readonly showAddPreOrder = computed(() => !(this.isGroup() && this.ownerSubmitted()));

  readonly canGiveFeedback = computed(() => {
    const status = this.reservation().status;

    return (
      status === ReservationStatusCustomer.InProgress ||
      status === ReservationStatusCustomer.Finished
    );
  });

  readonly hasFullFeedback = computed(() => {
    const feedback = this.reservation().feedback;

    return feedback?.cuisineExperience != null && feedback?.service != null;
  });

  constructor() {
    // The card is created per reservation, so one quiet lookup is enough.
    queueMicrotask(() => this.loadProgress());
  }

  onPreOrder(): void {
    const reservation = this.reservation();
    const queryParams = buildPreOrderQueryParams(reservation, reservation.tableName || `Table ${reservation.tableId}`);
    void this.router.navigate(['/menu'], { queryParams });
  }

  onGroupOrder(): void {
    void this.router.navigate(['/reservations', this.reservation().id, 'group-order']);
  }

  private loadProgress(): void {
    if (!this.isGroup() || this.reservation().status === ReservationStatusCustomer.Cancelled) {
      return;
    }

    this.groupOrdersService
      .getPreOrderProgress$(this.reservation().id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.progress.set(result));
  }
}
