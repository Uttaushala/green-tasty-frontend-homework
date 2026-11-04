// "Start service" / "Finish service": the status PATCH only confirms with a message, so the
// waiter's own reservation list must apply the status it sent, not something read off the response.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { Reservation, ReservationStatusCustomer } from '@app/models/reservations/reservation.model';
import { ReservationService } from '@app/services/reservation/reservation.service';
import { TableService } from '@app/services/table/table.service';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import { UsersService } from '@app/services/users/users.service';
import { WaitersService } from '@app/services/waiters/waiters.service';
import { LocationsService } from '@app/services/locations/locations.service';
import { ToastService } from '@app/services/toast/toast.service';
import { WaiterDashboardComponent } from './waiter-dashboard.component';

const RESERVATION: Reservation = {
  id: 'res-1',
  tableId: 'table-1',
  customerId: '',
  startTime: new Date('2026-11-04T10:45:00Z'),
  endTime: new Date('2026-11-04T12:15:00Z'),
  guestCount: 1,
  status: 0,
  locationAddress: 'Abashidze Street 9',
  tableCapacity: 4,
  waiterId: 'waiter-1',
};

describe('WaiterDashboardComponent status change', () => {
  let fixture: ComponentFixture<WaiterDashboardComponent>;
  let reservationService: jasmine.SpyObj<ReservationService>;

  beforeEach(async () => {
    localStorage.setItem('auth', JSON.stringify({ idToken: 'token' }));
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'waiter-1', firstName: 'Nina', lastName: 'Waiterova', email: 'nina@example.com', role: 'Waiter' }),
    );

    reservationService = jasmine.createSpyObj<ReservationService>('ReservationService', [
      'getReservationsForUser$',
      'getReservationFeedback',
      'changeReservationStatus$',
    ]);
    reservationService.getReservationsForUser$.and.returnValue(of([RESERVATION]));
    reservationService.getReservationFeedback.and.returnValue(of(null));

    const tableService = jasmine.createSpyObj<TableService>('TableService', ['getAvailableTablesWithoutStartTime$']);
    tableService.getAvailableTablesWithoutStartTime$.and.returnValue(of([]));

    const preOrdersService = jasmine.createSpyObj<PreOrdersService>('PreOrdersService', ['getByReservationId']);
    preOrdersService.getByReservationId.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    (preOrdersService as { changes$: unknown }).changes$ = of(undefined);

    const usersService = jasmine.createSpyObj<UsersService>('UsersService', ['getUserName']);

    const waitersService = jasmine.createSpyObj<WaitersService>('WaitersService', ['getWaiterLocationId']);
    waitersService.getWaiterLocationId.and.returnValue(of('loc-1'));

    const locationsService = jasmine.createSpyObj<LocationsService>('LocationsService', ['getLocationById']);
    locationsService.getLocationById.and.returnValue(
      of({ id: 'loc-1', address: 'Abashidze Street 9', description: '', totalCapacity: 4, averageOccupancy: '0%', imageUrl: '', rating: 0 }),
    );

    await TestBed.configureTestingModule({
      imports: [WaiterDashboardComponent],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://test.api' },
        { provide: ReservationService, useValue: reservationService },
        { provide: TableService, useValue: tableService },
        { provide: PreOrdersService, useValue: preOrdersService },
        { provide: UsersService, useValue: usersService },
        { provide: WaitersService, useValue: waitersService },
        { provide: LocationsService, useValue: locationsService },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info']) },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WaiterDashboardComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('auth');
    localStorage.removeItem('user');
  });

  it('applies the status it sent, since the API confirms with a message only', () => {
    reservationService.changeReservationStatus$.and.returnValue(of({ message: 'Reservation status updated successfully.' }));
    const component = fixture.componentInstance;

    component.onReservationStatusChanged({ id: 'res-1', newStatus: ReservationStatusCustomer.InProgress });

    expect(component.reservations()[0].status).toBe(ReservationStatusCustomer.InProgress);
  });
});
