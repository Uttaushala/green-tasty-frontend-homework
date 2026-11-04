import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import {
  Component,
  computed,
  inject,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { OrderItem } from '@app/models/dishes/order-item.model';
import { firstValueFrom } from 'rxjs';
import { WaiterPreOrderState } from '@app/models/orders/order.model';
import { PricePipe } from '@app/shared/pipes/price.pipe';

/** Order.status values relevant to this page (see backend OrderStatus). */
const ORDER_STATUS_SUBMITTED_BY_WAITER = 1;

@Component({
  selector: 'app-waiter-pre-order-page',
  imports: [DatePipe, PricePipe],
  templateUrl: './waiter-pre-order-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './waiter-pre-order-page.component.scss',
})
export class WaiterPreOrderPageComponent implements OnInit {
  orderItems: OrderItem[] = [];

  reservationId = '';
  createdByName = '';
  createdByRole = '';
  tableName = '';
  locationAddress = '';
  startTime = '';
  endTime = '';
  guestCount = 0;
  @Input() customClass = '';

  /** Once the waiter has reviewed every dish, the order is auto-submitted and this page locks. */
  readonly viewMode = signal(false);
  readonly loading = signal(true);
  /** Dish id with a confirm/reject request in flight — its row disables while it resolves. */
  readonly mutatingDishId = signal<string | null>(null);

  readonly hasRejected = computed(() => this.orderItems.some((item) => item.state === 2));
  readonly allReviewed = computed(() => this.orderItems.every((item) => item.state !== 0));

  private router = inject(Router);
  private toast = inject(ToastService);

  preOrdersService = inject(PreOrdersService);

  ngOnInit(): void {
    const navState = this.router.getCurrentNavigation()?.extras.state as
      | WaiterPreOrderState
      | undefined;
    let data = navState;

    if (!data?.reservationId) {
      const stored = sessionStorage.getItem('waiterPreOrderData');
      if (stored) {
        data = JSON.parse(stored);
      }
    }

    if (!data?.reservationId) {
      this.toast.error('Reservation not found. Please go back and try again.', 'Pre-order');
      this.loading.set(false);
      return;
    }

    this.createdByName = data.createdByName;
    this.createdByRole = data.createdByRole;
    this.tableName = data.tableName;
    this.reservationId = data.reservationId;
    this.locationAddress = data.locationAddress ?? '';
    this.startTime = data.startTime ?? '';
    this.endTime = data.endTime ?? '';
    this.guestCount = data.guestCount ?? 0;

    firstValueFrom(this.preOrdersService.getByReservationId(data.reservationId))
      .then((order) => {
        this.orderItems = order.orderItems ?? [];
        this.viewMode.set(order.status === ORDER_STATUS_SUBMITTED_BY_WAITER);
      })
      .catch(() => {
        this.toast.error('The pre-order could not be loaded.', 'Pre-order');
      })
      .finally(() => this.loading.set(false));
  }

  confirmDish(dishId: string): void {
    this.reviewDish(dishId, 1, () => this.preOrdersService.confirmDishInOrder(this.reservationId, dishId));
  }

  rejectDish(dishId: string): void {
    this.reviewDish(dishId, 2, () => this.preOrdersService.rejectDishInOrder(this.reservationId, dishId));
  }

  /** Figma "Submit Pre-order": once every dish has been reviewed, it just closes the page —
   * the last confirm/reject call already told the backend to send the order back to the owner. */
  close(): void {
    void this.router.navigate(['/waiter-reservations']);
  }

  private reviewDish(dishId: string, newState: number, request: () => ReturnType<PreOrdersService['confirmDishInOrder']>): void {
    if (this.viewMode() || this.mutatingDishId() !== null) {
      return;
    }
    this.mutatingDishId.set(dishId);

    request().subscribe({
      next: () => {
        this.orderItems = this.orderItems.map((item) =>
          item.dish.id === dishId ? { ...item, state: newState } : item,
        );
        this.mutatingDishId.set(null);

        if (this.allReviewed()) {
          this.viewMode.set(true);
          this.toast.success('All dishes reviewed — the pre-order has been sent back to the owner.', 'Pre-order');
        }
      },
      error: () => {
        this.mutatingDishId.set(null);
        this.toast.error('The dish could not be updated. Please try again.', 'Pre-order');
      },
    });
  }
}
