import { buildPreOrderQueryParams } from '@app/shared/helpers/pre-order-query-params';
import { PricePipe } from '@app/shared/pipes/price.pipe';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Observable, Subject, catchError, exhaustMap, filter, forkJoin, merge, of, switchMap, timer } from 'rxjs';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';
import { GroupReservationStatus } from '@app/models/group-orders/group-status.model';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { Participant } from '@app/models/group-orders/participant.model';
import { Order } from '@app/models/orders/order.model';
import { RemindGuestsResponse } from '@app/models/group-orders/remind-guests.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';
import { consolidatePreOrder } from '@app/shared/helpers/consolidate-pre-order';
import { markGuestsSeen } from '@app/shared/helpers/seen-guests';
import { withOwnerOrder } from '@app/shared/mappers/owner-order.mapper';

/** Як часто підтягуємо свіжі кошики, поки група Open. */
export const SYNC_INTERVAL_MS = 15_000;

type LoadError = 'not-found' | 'failed';

/** Бекенд забороняє змінювати замовлення пізніше ніж за 30 хвилин до початку броні. */
export const MODIFICATION_CUTOFF_MS = 30 * 60_000;

/** Як часто перераховуємо, чи не настав режим перегляду. */
const CLOCK_TICK_MS = 30_000;

/** Значення `remindingTarget`, коли нагадування йде всім гостям одразу. */
const ALL_GUESTS = 'all';

@Component({
  selector: 'app-group-order-page',
  imports: [PricePipe, ParticipantCardComponent, ModalComponent, DatePipe],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { '(click)': 'onBackdropClick($event)', '(document:keydown.escape)': 'onEscape()' },
})
export class GroupOrderPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly groupOrdersService = inject(GroupOrdersService);
  private readonly preOrdersService = inject(PreOrdersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reservationId = this.route.snapshot.paramMap.get('reservationId') ?? '';
  private readonly refreshRequested$ = new Subject<void>();

  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
  /** The owner's own regular order, kept as-is so a quantity/remove edit can PUT it straight back. */
  private readonly ownerOrder = signal<Order | null>(null);
  readonly ownerSessionId = signal('');
  readonly status = signal<GroupReservationStatus>('Open');

  readonly loading = signal(true);
  readonly loadError = signal<LoadError | null>(null);
  readonly lastUpdated = signal<Date | null>(null);
  readonly syncFailed = signal(false);

  readonly submitDialogOpen = signal(false);
  readonly submitting = signal(false);
  readonly guestToRemove = signal<Participant | null>(null);
  readonly removing = signal(false);
  /** Dish id currently being quantity-changed or removed, so its row can disable itself. */
  readonly mutatingItemId = signal<string | null>(null);
  /** Participant id whose card owns the in-flight `mutatingItemId` edit. */
  readonly mutatingParticipantId = signal<string | null>(null);
  /** id гостя (або ALL_GUESTS), якому зараз відправляється нагадування. */
  readonly remindingTarget = signal<string | null>(null);

  readonly groupId = computed(() => this.invite()?.GroupReservationId ?? '');
  readonly isSent = computed(() => this.status() === 'Submitted');

  private readonly now = signal(Date.now());
  /** Менше 30 хвилин до початку броні (або вона вже почалась): лише перегляд, без змін. */
  readonly viewMode = computed(() => {
    const invite = this.invite();
    if (!invite) {
      return false;
    }
    const start = Date.parse(invite.StartTime);
    return !Number.isNaN(start) && start - this.now() < MODIFICATION_CUTOFF_MS;
  });

  // The owner's own cart goes first, as in the design; guests keep the server order.
  readonly orderedParticipants = computed(() => {
    const everyone = this.participants();
    return [...everyone.filter((person) => person.type === 'Owner'), ...everyone.filter((person) => person.type !== 'Owner')];
  });
  /** В замовлення ресторану йдуть лише підтверджені кошики, однакові страви об'єднані. */
  readonly consolidated = computed(() => consolidatePreOrder(this.participants()));
  readonly pendingCount = computed(() => this.participants().filter((person) => !person.isSubmitted).length);
  /** Гості (не Owner), які ще не підтвердили кошик — саме їм можна нагадати. */
  readonly remindableGuests = computed(() =>
    this.participants().filter((person) => person.type === 'Guest' && !person.isSubmitted),
  );
  readonly canRemind = computed(() => !this.isSent() && !this.viewMode() && this.status() === 'Open');
  readonly allReminding = computed(() => this.remindingTarget() === ALL_GUESTS);
  readonly canSubmit = computed(
    () => !this.isSent() && !this.viewMode() && !this.submitting() && this.consolidated().items.length > 0,
  );

  readonly statusLabel = computed(() => {
    switch (this.status()) {
      case 'Submitted':
        return 'Sent to Restaurant';
      case 'Closed':
        return 'Closed';
      default:
        return 'Collecting pre-orders';
    }
  });

  constructor() {
    this.load();
    this.startSync();
    timer(CLOCK_TICK_MS, CLOCK_TICK_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.groupOrdersService
      .getGroupInvite$(this.reservationId)
      .pipe(
        switchMap((invite) =>
          forkJoin({
            invite: of(invite),
            sessions: this.groupOrdersService.getSessions$(invite.GroupReservationId),
            ownerSessionId: this.groupOrdersService.getOwnerSessionId$(this.reservationId),
            status: this.groupOrdersService.getStatus$(invite.GroupReservationId),
            ownerOrder: this.groupOrdersService.getOwnerOrder$(this.reservationId),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ invite, sessions, ownerSessionId, status, ownerOrder }) => {
          this.invite.set(invite);
          this.participants.set(this.withOwnerDishes(sessions.participants, ownerOrder, status.status));
          this.ownerOrder.set(ownerOrder);
          this.ownerSessionId.set(ownerSessionId);
          this.status.set(status.status);
          this.lastUpdated.set(new Date());
          this.syncFailed.set(false);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed');
          this.loading.set(false);
        },
      });
  }

  /** Closes the window and returns to the reservations list underneath it. */
  /** Figma "Edit my Pre-Order": the owner goes back to the menu in pre-order mode for this reservation. */
  editMyPreOrder(): void {
    const invite = this.invite();
    if (!invite) {
      return;
    }
    const queryParams = buildPreOrderQueryParams(
      { id: this.reservationId, locationAddress: invite.LocationAddress, startTime: invite.StartTime, endTime: invite.EndTime },
      `Table ${invite.TableNumber}`,
    );
    void this.router.navigate(['/menu'], { queryParams });
  }

  /** Inline +/- on a pre-order row: the owner's own card PUTs their order back; a guest's card
   * goes through the owner-only group-session endpoint instead. */
  updateItemQuantity(person: Participant, dishId: string, quantity: number): void {
    if (quantity < 1) {
      return;
    }
    if (person.id === this.ownerSessionId()) {
      this.mutateOwnerOrder(dishId, (order) => ({
        ...order,
        orderItems: order.orderItems.map((item) => (item.dish.id === dishId ? { ...item, quantity } : item)),
      }));
    } else {
      this.mutateGuestSession(person, dishId, () =>
        this.groupOrdersService.setGuestDishQuantity$(this.groupId(), person.id, dishId, quantity),
      );
    }
  }

  /** Inline trash on a pre-order row: the owner's own card PUTs their order back without that dish;
   * a guest's card goes through the owner-only group-session endpoint instead. */
  removeItem(person: Participant, dishId: string): void {
    if (person.id === this.ownerSessionId()) {
      this.mutateOwnerOrder(dishId, (order) => ({
        ...order,
        orderItems: order.orderItems.filter((item) => item.dish.id !== dishId),
      }));
    } else {
      this.mutateGuestSession(person, dishId, () => this.groupOrdersService.removeGuestDish$(this.groupId(), person.id, dishId));
    }
  }

  private mutateOwnerOrder(dishId: string, updateFn: (order: Order) => Order): void {
    const order = this.ownerOrder();
    if (!order || this.mutatingParticipantId() !== null) {
      return;
    }
    this.mutatingParticipantId.set(this.ownerSessionId());
    this.mutatingItemId.set(dishId);

    this.preOrdersService
      .editPreOrderByReservationId(this.reservationId, updateFn(order))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.mutatingParticipantId.set(null);
          this.mutatingItemId.set(null);
          // Not refresh(): that's gated to status === 'Open', but editing stays allowed after Submitted too.
          this.load();
        },
        // toast з текстом помилки вже показав tokenInterceptor
        error: () => {
          this.mutatingParticipantId.set(null);
          this.mutatingItemId.set(null);
        },
      });
  }

  private mutateGuestSession(person: Participant, dishId: string, request: () => Observable<GroupSessionsResponse>): void {
    if (this.mutatingParticipantId() !== null) {
      return;
    }
    this.mutatingParticipantId.set(person.id);
    this.mutatingItemId.set(dishId);

    request()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // список і суми оновлюються з відповіді сервера — через ті самі computed()
        next: (response) => {
          this.participants.set(response.participants);
          this.mutatingParticipantId.set(null);
          this.mutatingItemId.set(null);
        },
        // toast з текстом помилки вже показав tokenInterceptor
        error: () => {
          this.mutatingParticipantId.set(null);
          this.mutatingItemId.set(null);
        },
      });
  }

  close(): void {
    markGuestsSeen(
      this.reservationId,
      this.participants().filter((person) => person.type === 'Guest').length,
    );
    void this.router.navigate(['/reservations']);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  onEscape(): void {
    // Escape belongs to an open confirmation dialog first.
    if (!this.submitDialogOpen() && !this.guestToRemove()) {
      this.close();
    }
  }

  /** «Refresh»: синхронізуватись зараз, не чекаючи таймера. */
  refresh(): void {
    this.refreshRequested$.next();
  }

  openSubmitDialog(): void {
    if (this.canSubmit()) {
      this.submitDialogOpen.set(true);
    }
  }

  closeSubmitDialog(): void {
    if (!this.submitting()) {
      this.submitDialogOpen.set(false);
    }
  }

  submit(): void {
    if (this.submitting() || !this.canSubmit()) {
      return;
    }
    this.submitting.set(true);

    this.groupOrdersService
      .submit$(this.groupId(), this.reservationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.status.set('Submitted');
          this.submitting.set(false);
          this.submitDialogOpen.set(false);
          this.toastService.success('Pre-order sent to the restaurant');
        },
        // toast з текстом помилки вже показав tokenInterceptor — тут лише повертаємо екран у робочий стан
        error: () => {
          this.submitting.set(false);
          this.submitDialogOpen.set(false);
        },
      });
  }

  /** «Remind» біля гостя (передано guest) або «Remind all» (без аргументу). */
  remind(guest?: Participant): void {
    if (this.remindingTarget() !== null || !this.canRemind()) {
      return;
    }
    this.remindingTarget.set(guest?.id ?? ALL_GUESTS);

    this.groupOrdersService
      .remind$(this.groupId(), guest?.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.remindingTarget.set(null);
          this.showReminderResult(response);
        },
        // toast з текстом помилки вже показав tokenInterceptor
        error: () => this.remindingTarget.set(null),
      });
  }

  private showReminderResult(response: RemindGuestsResponse): void {
    const { reminded, skipped } = response;
    if (reminded.length > 0) {
      this.toastService.success(
        reminded.length === 1 ? `Reminder sent to ${reminded[0].guestName}` : `Reminder sent to ${reminded.length} guests`,
      );
    }

    const tooSoon = skipped.filter((item) => item.reason === 'too_soon').map((item) => item.guestName);
    if (tooSoon.length > 0) {
      this.toastService.info(`${tooSoon.join(', ')} ${tooSoon.length === 1 ? 'was' : 'were'} reminded less than 2 minutes ago`);
    } else if (reminded.length === 0) {
      this.toastService.info('Everyone has already submitted their cart');
    }
  }

  askRemoveGuest(guest: Participant): void {
    if (this.viewMode()) {
      return;
    }
    this.guestToRemove.set(guest);
  }

  cancelRemoveGuest(): void {
    if (!this.removing()) {
      this.guestToRemove.set(null);
    }
  }

  confirmRemoveGuest(): void {
    const guest = this.guestToRemove();
    if (!guest || this.removing() || this.viewMode()) {
      return;
    }
    this.removing.set(true);

    this.groupOrdersService
      .removeSession$(this.groupId(), guest.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // список і суми оновлюються з відповіді сервера — через ті самі computed()
        next: (response) => {
          this.participants.set(response.participants);
          this.removing.set(false);
          this.guestToRemove.set(null);
          this.toastService.success('Guest Removed');
        },
        error: () => {
          this.removing.set(false);
          this.guestToRemove.set(null);
        },
      });
  }

  /**
   * Один потік на весь час життя сторінки: тик таймера або «Refresh» → запит.
   * exhaustMap — поки попередній запит не відповів, новий не стартує;
   * filter — таймер нічого не робить, доки група не завантажена і після Submit;
   * takeUntilDestroyed — при виході зі сторінки все зупиняється.
   */
  private startSync(): void {
    merge(timer(SYNC_INTERVAL_MS, SYNC_INTERVAL_MS), this.refreshRequested$)
      .pipe(
        filter(() => this.canSync()),
        exhaustMap(() => this.fetchLatest$()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private canSync(): boolean {
    return !this.loading() && this.loadError() === null && this.groupId() !== '' && this.status() === 'Open';
  }

  /**
   * Once the group is sent, the regular order also holds every submitted guest's dishes,
   * so those are taken out and only the owner's own dishes stay in "My Pre-Order".
   */
  private withOwnerDishes(participants: Participant[], ownerOrder: Order | null, status: GroupReservationStatus): Participant[] {
    return withOwnerOrder(participants, ownerOrder, status !== 'Open');
  }

  private fetchLatest$() {
    const groupId = this.groupId();
    return forkJoin({
      sessions: this.groupOrdersService.getSessions$(groupId, { silent: true }),
      status: this.groupOrdersService.getStatus$(groupId, { silent: true }),
      ownerOrder: this.groupOrdersService.getOwnerOrder$(this.reservationId),
    }).pipe(
      switchMap(({ sessions, status, ownerOrder }) => {
        this.participants.set(this.withOwnerDishes(sessions.participants, ownerOrder, status.status));
        this.ownerOrder.set(ownerOrder);
        this.status.set(status.status);
        this.lastUpdated.set(new Date());
        this.syncFailed.set(false);
        return EMPTY;
      }),
      // фонова помилка: лишаємо останні дані, без toast
      catchError(() => {
        this.syncFailed.set(true);
        return EMPTY;
      }),
    );
  }
}
