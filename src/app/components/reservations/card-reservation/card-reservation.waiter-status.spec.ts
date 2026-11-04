// Figma "Reservations. With/without pre-order": the waiter card's colored status strip,
// icon-only trash/pencil actions, and the table control switching from editable to plain text.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
    guestCount: 2,
    status: ReservationStatusCustomer.Reserved,
    restaurantName: 'Green & Tasty',
    locationAddress: 'Rustaveli Avenue 48',
    waiterId: 'waiter-1',
    ...overrides,
  };
}

const STATUS_ENUM = {
  [ReservationStatusCustomer.Reserved]: { class: 'reserved', label: 'Reserved' },
  [ReservationStatusCustomer.Cancelled]: { class: 'canceled', label: 'Cancelled' },
  [ReservationStatusCustomer.InProgress]: { class: 'in-progress', label: 'In Progress' },
  [ReservationStatusCustomer.Finished]: { class: 'finished', label: 'Completed' },
};

describe('CardReservationComponent · waiter status strip (Figma)', () => {
  let fixture: ComponentFixture<CardReservationComponent>;
  let element: HTMLElement;

  function render(reservation: ReservationCustomer): void {
    fixture.componentRef.setInput('r', reservation);
    fixture.componentRef.setInput('role', Roles.WAITER);
    fixture.componentRef.setInput('statusEnum', STATUS_ENUM);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardReservationComponent],
      providers: [provideRouter([]), { provide: API_BASE_URL, useValue: 'https://test.api' }],
    }).compileComponents();
    fixture = TestBed.createComponent(CardReservationComponent);
  });

  it('colors the status strip per reservation status and labels it', () => {
    render(buildReservation({ status: ReservationStatusCustomer.InProgress }));

    const header = element.querySelector('.status-header');
    expect(header?.classList).toContain('in-progress');
    expect(header?.textContent?.trim()).toBe('In Progress');
  });

  it('shows a trash and pencil icon button while the reservation is Reserved', () => {
    render(buildReservation());

    expect(element.querySelector('[aria-label="Cancel reservation"]')).toBeTruthy();
    expect(element.querySelector('[aria-label="Postpone reservation"]')).toBeTruthy();
  });

  it('shows only the pencil icon button once the reservation is In Progress', () => {
    render(buildReservation({ status: ReservationStatusCustomer.InProgress }));

    expect(element.querySelector('[aria-label="Cancel reservation"]')).toBeFalsy();
    expect(element.querySelector('[aria-label="Postpone reservation"]')).toBeTruthy();
  });

  it('hides both icon buttons once the reservation is Completed', () => {
    render(buildReservation({ status: ReservationStatusCustomer.Finished }));

    expect(element.querySelector('[aria-label="Cancel reservation"]')).toBeFalsy();
    expect(element.querySelector('[aria-label="Postpone reservation"]')).toBeFalsy();
  });

  it('keeps the table editable while Reserved, but shows it as plain text once Completed', () => {
    render(buildReservation());
    expect(element.querySelector('.table-select')).toBeTruthy();
    expect(element.querySelector('.table-label')).toBeFalsy();

    render(buildReservation({ status: ReservationStatusCustomer.Finished }));
    expect(element.querySelector('.table-select')).toBeFalsy();
    expect(element.querySelector('.table-label')).toBeTruthy();
  });
});
