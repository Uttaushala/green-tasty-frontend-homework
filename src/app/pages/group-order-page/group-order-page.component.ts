import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Subject, catchError, exhaustMap, filter, forkJoin, merge, of, switchMap, timer } from 'rxjs';
import { ParticipantCardComponent } from '@app/components/group-orders/participant-card/participant-card.component';
import { GroupReservationStatus } from '@app/models/group-orders/group-status.model';
import { Participant } from '@app/models/group-orders/participant.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { ModalComponent } from '@app/shared/custom-components/modal/modal.component';
import { consolidatePreOrder } from '@app/shared/helpers/consolidate-pre-order';

/** Як часто підтягуємо свіжі кошики, поки група Open. */
export const SYNC_INTERVAL_MS = 15_000;

type LoadError = 'not-found' | 'failed';

@Component({
  selector: 'app-group-order-page',
  imports: [ParticipantCardComponent, ModalComponent, CurrencyPipe, DatePipe],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly groupOrdersService = inject(GroupOrdersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly reservationId = this.route.snapshot.paramMap.get('reservationId') ?? '';
  private readonly refreshRequested$ = new Subject<void>();

  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
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

  readonly groupId = computed(() => this.invite()?.GroupReservationId ?? '');
  readonly isSent = computed(() => this.status() === 'Submitted');

  /** В замовлення ресторану йдуть лише підтверджені кошики, однакові страви об'єднані. */
  readonly consolidated = computed(() => consolidatePreOrder(this.participants()));
  readonly pendingCount = computed(() => this.participants().filter((person) => !person.isSubmitted).length);
  readonly hasAnyDishes = computed(() => this.participants().some((person) => person.items.length > 0));
  readonly canSubmit = computed(
    () => !this.isSent() && !this.submitting() && this.consolidated().items.length > 0,
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
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ invite, sessions, ownerSessionId, status }) => {
          this.invite.set(invite);
          this.participants.set(sessions.participants);
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

  askRemoveGuest(guest: Participant): void {
    this.guestToRemove.set(guest);
  }

  cancelRemoveGuest(): void {
    if (!this.removing()) {
      this.guestToRemove.set(null);
    }
  }

  confirmRemoveGuest(): void {
    const guest = this.guestToRemove();
    if (!guest || this.removing()) {
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

  private fetchLatest$() {
    const groupId = this.groupId();
    return forkJoin({
      sessions: this.groupOrdersService.getSessions$(groupId, { silent: true }),
      status: this.groupOrdersService.getStatus$(groupId, { silent: true }),
    }).pipe(
      switchMap(({ sessions, status }) => {
        this.participants.set(sessions.participants);
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
