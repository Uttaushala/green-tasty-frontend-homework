import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationConfirmedComponent } from './reservation-confirmed.component';
import { Reservation, ReservationStatus } from '@app/models/reservations/reservation.model';

describe('ReservationConfirmedComponent', () => {
  let fixture: ComponentFixture<ReservationConfirmedComponent>;

  const reservation: Reservation = {
    id: 'res-1',
    tableId: 'table-1',
    customerId: 'customer-1',
    startTime: new Date('2026-10-17T12:00:00Z'),
    endTime: new Date('2026-10-17T13:30:00Z'),
    guestCount: 2,
    status: ReservationStatus.Reserved,
    locationAddress: '48 Rustaveli Avenue',
    tableCapacity: 4,
    waiterId: 'waiter-1',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationConfirmedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationConfirmedComponent);
    fixture.componentRef.setInput('reservation', reservation);
    fixture.detectChanges();
  });

  it('shows the reservation address', () => {
    expect(fixture.nativeElement.textContent).toContain('48 Rustaveli Avenue');
  });
});
