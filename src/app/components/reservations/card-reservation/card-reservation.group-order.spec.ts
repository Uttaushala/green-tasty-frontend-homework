import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ReservationCustomer, ReservationStatusCustomer } from '@app/models/reservations/reservation.model';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { Roles } from '@app/shared/constants/roles';
import { CardReservationComponent } from './card-reservation.component';

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

describe('CardReservationComponent · Group Pre-Order button', () => {
  let fixture: ComponentFixture<CardReservationComponent>;

  function render(reservation: ReservationCustomer, role: string = Roles.CUSTOMER): HTMLElement {
    fixture.componentRef.setInput('r', reservation);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function groupButton(root: HTMLElement): HTMLButtonElement | undefined {
    return Array.from(root.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Group Pre-Order'),
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardReservationComponent],
      providers: [provideRouter([]), { provide: API_BASE_URL, useValue: 'https://test.api' }],
    }).compileComponents();
    fixture = TestBed.createComponent(CardReservationComponent);
  });

  it('shows the button for a customer with an upcoming multi-guest reservation', () => {
    expect(groupButton(render(buildReservation()))).toBeTruthy();
  });

  it('hides the button for a single guest', () => {
    expect(groupButton(render(buildReservation({ guestCount: 1 })))).toBeUndefined();
  });

  it('hides the button when the reservation is not upcoming', () => {
    expect(groupButton(render(buildReservation({ status: ReservationStatusCustomer.Finished })))).toBeUndefined();
  });

  it('hides the button for a waiter', () => {
    expect(groupButton(render(buildReservation(), Roles.WAITER))).toBeUndefined();
  });

  it('navigates to the group order page of the reservation on click', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    groupButton(render(buildReservation()))?.click();

    expect(navigate).toHaveBeenCalledWith(['/reservations', 'res-1', 'group-order']);
  });

  describe('Invite Guests button', () => {
    function inviteButton(root: HTMLElement): HTMLButtonElement | undefined {
      return Array.from(root.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Invite Guests'),
      );
    }

    it('is shown together with Group Pre-Order for a multi-guest upcoming reservation', () => {
      expect(inviteButton(render(buildReservation()))).toBeTruthy();
    });

    it('is hidden for a single guest', () => {
      expect(inviteButton(render(buildReservation({ guestCount: 1 })))).toBeUndefined();
    });

    it('is hidden for a waiter', () => {
      expect(inviteButton(render(buildReservation(), Roles.WAITER))).toBeUndefined();
    });

    it('emits the reservation on click', () => {
      const reservation = buildReservation();
      const emitted: ReservationCustomer[] = [];
      fixture.componentInstance.inviteGuests.subscribe((value) => emitted.push(value));

      inviteButton(render(reservation))?.click();

      expect(emitted).toEqual([reservation]);
    });
  });
});
