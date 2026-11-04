import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ReservationCustomer,
  ReservationStatusCustomer,
} from '@app/models/reservations/reservation.model';
import { Order } from '@app/models/orders/order.model';
import { OrderItem } from '@app/models/dishes/order-item.model';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { Roles } from '@app/shared/constants/roles';
import { CardReservationComponent } from './card-reservation.component';

function buildOrder(status: number, itemCount: number): Order {
  return {
    orderId: 'order-1',
    reservationAddress: 'Rustaveli Avenue 48',
    reservationTime: '2026-11-10T16:00:00Z',
    reservationId: 'res-1',
    status,
    orderItems: Array.from({ length: itemCount }, () => ({}) as OrderItem),
  };
}

function buildReservation(overrides: Partial<ReservationCustomer> = {}): ReservationCustomer {
  return {
    id: 'res-1',
    tableId: 'table-1',
    startTime: new Date('2026-11-10T16:00:00Z'),
    endTime: new Date('2026-11-10T17:30:00Z'),
    guestCount: 4,
    status: ReservationStatusCustomer.Reserved,
    restaurantName: 'Green & Tasty',
    locationAddress: 'Rustaveli Avenue 48',
    waiterId: 'waiter-1',
    ...overrides,
  };
}

describe('CardReservationComponent · waiter order button label', () => {
  let fixture: ComponentFixture<CardReservationComponent>;

  function labels(reservation: ReservationCustomer): string[] {
    fixture.componentRef.setInput('r', reservation);
    fixture.componentRef.setInput('role', Roles.WAITER);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).map(
      (button) => (button.textContent ?? '').trim(),
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardReservationComponent],
      providers: [provideRouter([]), { provide: API_BASE_URL, useValue: 'https://test.api' }],
    }).compileComponents();
    fixture = TestBed.createComponent(CardReservationComponent);
  });

  it('shows "Submit Pre-order" for a reserved booking with a pre-order submitted by the customer', () => {
    expect(labels(buildReservation({ preOrder: buildOrder(3, 2) }))).toContain('Submit Pre-order');
  });

  it('shows "View Pre-order" once the waiter has submitted the pre-order', () => {
    expect(labels(buildReservation({ preOrder: buildOrder(1, 2) }))).toContain('View Pre-order');
  });

  it('shows "Edit Order" for an in-progress booking that has a pre-order', () => {
    const reservation = buildReservation({
      status: ReservationStatusCustomer.InProgress,
      preOrder: buildOrder(1, 2),
    });
    expect(labels(reservation)).toContain('Edit Order');
  });

  it('shows "View Order" for a finished booking that has an order', () => {
    const reservation = buildReservation({
      status: ReservationStatusCustomer.Finished,
      preOrder: buildOrder(1, 2),
    });
    expect(labels(reservation)).toContain('View Order');
  });

  it('shows no order button for a finished booking without an order', () => {
    const result = labels(buildReservation({ status: ReservationStatusCustomer.Finished }));
    expect(result.some((text) => text.includes('Order'))).toBeFalse();
  });

  it('shows no order button for a cancelled booking', () => {
    const result = labels(
      buildReservation({ status: ReservationStatusCustomer.Cancelled, preOrder: buildOrder(1, 2) }),
    );
    expect(result.some((text) => text.includes('Order'))).toBeFalse();
  });
});
