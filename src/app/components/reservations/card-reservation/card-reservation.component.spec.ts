import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReservationCustomer, ReservationStatusCustomer } from '@app/models/reservations/reservation.model';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { CardReservationComponent } from './card-reservation.component';

const RESERVATION: ReservationCustomer = {
  id: 'res-1',
  tableId: 'table-1',
  startTime: new Date('2026-11-10T16:00:00Z'),
  endTime: new Date('2026-11-10T17:30:00Z'),
  guestCount: 1,
  status: ReservationStatusCustomer.Reserved,
  restaurantName: 'Green & Tasty',
  locationAddress: 'Rustaveli Avenue 48',
  waiterId: 'waiter-1',
};

describe('CardReservationComponent', () => {
  let fixture: ComponentFixture<CardReservationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: API_BASE_URL, useValue: 'https://test.api' }],
      imports: [CardReservationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardReservationComponent);
    fixture.componentRef.setInput('r', RESERVATION);
    fixture.detectChanges();
  });

  it('shows the status label in the coloured header strip for a customer', () => {
    fixture.componentRef.setInput('statusEnum', { [ReservationStatusCustomer.Reserved]: { class: 'reserved', label: 'Reserved' } });
    fixture.detectChanges();

    const strip = (fixture.nativeElement as HTMLElement).querySelector('.status-strip');

    expect(strip?.textContent?.trim()).toBe('Reserved');
    expect(strip?.classList).toContain('reserved');
  });

  it('renders the location address and guest count', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Rustaveli Avenue 48');
    expect(text).toContain('1 Guest');
  });
});
