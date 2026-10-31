import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of } from 'rxjs';

import { PreOrderProgress } from '@app/models/group-orders/pre-order-progress.model';
import { FeedbackResponseItem } from '@app/models/feedbacks/feedback-response-item.model';
import {
  ReservationCustomer,
  ReservationStatusCustomer,
} from '@app/models/reservations/reservation.model';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { markGuestsSeen } from '@app/shared/helpers/seen-guests';

import { CustomerReservationCardComponent } from './customer-reservation-card.component';

function buildReservation(overrides: Partial<ReservationCustomer> = {}): ReservationCustomer {
  return {
    id: 'res-1',
    tableId: 'tbl-1',
    startTime: new Date('2026-10-17T12:00:00'),
    endTime: new Date('2026-10-17T14:00:00'),
    guestCount: 4,
    status: ReservationStatusCustomer.Reserved,
    restaurantName: 'Green & Tasty',
    locationAddress: '48 Rustaveli Avenue',
    waiterId: 'w-1',
    ...overrides,
  };
}

const rating = { rating: 5 } as FeedbackResponseItem;

describe('CustomerReservationCardComponent', () => {
  let fixture: ComponentFixture<CustomerReservationCardComponent>;
  let progress$: Observable<PreOrderProgress | null>;

  function render(reservation: ReservationCustomer, progress: PreOrderProgress | null) {
    progress$ = of(progress);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GroupOrdersService, useValue: { getPreOrderProgress$: () => progress$ } },
      ],
    });
    fixture = TestBed.createComponent(CustomerReservationCardComponent);
    fixture.componentRef.setInput('reservation', reservation);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => localStorage.clear());

  it('shows Add Pre-Order while the owner has not submitted', async () => {
    const host = render(buildReservation(), { submitted: 1, guestsJoined: 1 });
    await settle();

    expect(host.querySelector('.actions')?.textContent).toContain('Add Pre-Order');
  });

  it('shows only Group Pre-Order once the owner has submitted a group reservation', async () => {
    const host = render(buildReservation({ hasSubmittedPreOrder: true }), { submitted: 1, guestsJoined: 1 });
    await settle();

    const text = host.querySelector('.actions')?.textContent ?? '';
    expect(text).toContain('Group Pre-Order');
    expect(text).not.toContain('Add Pre-Order');
  });

  it('shows both buttons when guests joined but the owner has not submitted yet', async () => {
    const host = render(buildReservation(), { submitted: 0, guestsJoined: 2 });
    await settle();

    const text = host.querySelector('.actions')?.textContent ?? '';
    expect(text).toContain('Group Pre-Order');
    expect(text).toContain('Add Pre-Order');
  });

  it('shows only Add Pre-Order when nobody has joined the group yet', async () => {
    const host = render(buildReservation(), { submitted: 0, guestsJoined: 0 });
    await settle();

    const text = host.querySelector('.actions')?.textContent ?? '';
    expect(text).not.toContain('Group Pre-Order');
    expect(text).toContain('Add Pre-Order');
  });

  it('renders the submitted/total counter for a group', async () => {
    const host = render(buildReservation(), { submitted: 3, guestsJoined: 3 });
    await settle();

    expect(host.querySelector('.progress')?.textContent?.replace(/\s/g, '')).toBe('3/4');
  });

  it('falls back to the owner order count when the group data is unavailable', async () => {
    const host = render(buildReservation({ hasSubmittedPreOrder: true }), null);
    await settle();

    expect(host.querySelector('.progress')?.textContent?.replace(/\s/g, '')).toBe('1/4');
  });

  it('shows 0 submitted when the group is unavailable and the owner has not ordered', async () => {
    const host = render(buildReservation(), null);
    await settle();

    expect(host.querySelector('.progress')?.textContent?.replace(/\s/g, '')).toBe('0/4');
  });

  it('hides the invite row and counter for a single guest', async () => {
    const host = render(buildReservation({ guestCount: 1 }), null);
    await settle();

    expect(host.querySelector('.share')).toBeNull();
    expect(host.querySelector('.progress')).toBeNull();
    expect(host.textContent).toContain('1 Guest');
  });

  it('shows the orange dot only when more guests joined than were seen', async () => {
    const host = render(buildReservation(), { submitted: 1, guestsJoined: 2 });
    await settle();
    expect(host.querySelector('.dot')).not.toBeNull();

    markGuestsSeen('res-1', 2);
    fixture.componentRef.setInput('reservation', buildReservation({ guestCount: 5 }));
    fixture.detectChanges();
    expect(host.querySelector('.dot')).toBeNull();
  });

  it('shows the trash icon only for Reserved and emits the id', async () => {
    const host = render(buildReservation(), null);
    const emitted: string[] = [];
    fixture.componentInstance.cancelReservation.subscribe((id) => emitted.push(id));
    await settle();

    (host.querySelector('.trash') as HTMLButtonElement).click();

    expect(emitted).toEqual(['res-1']);
  });

  it('has no trash icon and no actions for a cancelled reservation', async () => {
    const host = render(buildReservation({ status: ReservationStatusCustomer.Cancelled }), null);
    await settle();

    expect(host.querySelector('.trash')).toBeNull();
    expect(host.querySelectorAll('.actions button').length).toBe(0);
    expect(host.querySelector('.status')?.textContent).toContain('Cancelled');
  });

  it('offers Leave Feedback for a finished reservation without feedback', async () => {
    const host = render(buildReservation({ status: ReservationStatusCustomer.Finished }), null);
    await settle();

    expect(host.querySelector('.actions')?.textContent).toContain('Leave Feedback');
    expect(host.querySelector('.status')?.textContent).toContain('Completed');
  });

  it('offers Update Feedback when the feedback is complete', async () => {
    const host = render(
      buildReservation({
        status: ReservationStatusCustomer.Finished,
        feedback: { cuisineExperience: rating, service: rating },
      }),
      null,
    );
    await settle();

    expect(host.querySelector('.actions')?.textContent).toContain('Update Feedback');
  });

  it('passes a readable reservation label to the menu', async () => {
    render(buildReservation({ tableName: 'Table 1' }), null);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture.componentInstance.onPreOrder();

    const extras = navigate.calls.mostRecent().args[1] as { queryParams: { reservationLabel: string } };
    expect(extras.queryParams.reservationLabel).toBe('48 Rustaveli Avenue, Table 1, Oct 17, 2026, 12:00 - 14:00');
  });

  it('opens the group order route', async () => {
    render(buildReservation({ hasSubmittedPreOrder: true }), { submitted: 1, guestsJoined: 1 });
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture.componentInstance.onGroupOrder();

    expect(navigate).toHaveBeenCalledWith(['/reservations', 'res-1', 'group-order']);
  });
});
