// Рівень 2 · сервіс GroupOrdersService: URL, метод, тіло кожного запиту.
// Запуск: npm run test:hw
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { GroupOrdersService } from './group-orders.service';

const BASE_URL = 'https://api.test';

describe('Рівень 2 · GroupOrdersService', () => {
  let service: GroupOrdersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: BASE_URL }],
    });
    service = TestBed.inject(GroupOrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getGroupInvite$: reservationId → invite-token → invite', () => {
    let groupId = '';
    service.getGroupInvite$('res-1').subscribe((invite) => (groupId = invite.GroupReservationId));

    http.expectOne(`${BASE_URL}/reservations/res-1/invite-token`).flush({ token: 'tok' });
    http.expectOne(`${BASE_URL}/guest/invites/tok`).flush({ GroupReservationId: 'grp-1' });

    expect(groupId).toBe('grp-1');
  });

  it('getGroupInvite$: якщо публічний invite недоступний — owner-ендпоїнт', () => {
    let groupId = '';
    service.getGroupInvite$('res-1').subscribe((invite) => (groupId = invite.GroupReservationId));

    http.expectOne(`${BASE_URL}/reservations/res-1/invite-token`).flush({ token: 'tok' });
    http
      .expectOne(`${BASE_URL}/guest/invites/tok`)
      .flush({ message: 'full' }, { status: 400, statusText: 'Bad Request' });
    const fallback = http.expectOne(`${BASE_URL}/reservations/res-1/group-reservation`);
    expect(fallback.request.method).toBe('GET');
    fallback.flush({ GroupReservationId: 'grp-2' });

    expect(groupId).toBe('grp-2');
  });

  it('getGroupInvite$: якщо invite-token повернув помилку — теж owner-ендпоїнт', () => {
    let groupId = '';
    service.getGroupInvite$('res-1').subscribe((invite) => (groupId = invite.GroupReservationId));

    http
      .expectOne(`${BASE_URL}/reservations/res-1/invite-token`)
      .flush({ message: 'x' }, { status: 400, statusText: 'Bad Request' });
    http.expectOne(`${BASE_URL}/reservations/res-1/group-reservation`).flush({ GroupReservationId: 'grp-3' });

    expect(groupId).toBe('grp-3');
  });

  it('getSessions$: GET /guest/groups/{id}/sessions', () => {
    service.getSessions$('grp-1').subscribe();
    const req = http.expectOne(`${BASE_URL}/guest/groups/grp-1/sessions`);
    expect(req.request.method).toBe('GET');
    req.flush({ participants: [], total: 0 });
  });

  it('getOwnerSessionId$: повертає рядок guestSessionId', () => {
    let id = '';
    service.getOwnerSessionId$('res-1').subscribe((value) => (id = value));
    const req = http.expectOne(`${BASE_URL}/reservations/res-1/guest-session-id`);
    expect(req.request.method).toBe('GET');
    req.flush({ guestSessionId: 'owner-1' });
    expect(id).toBe('owner-1');
  });

  it('getOwnerOrder$: GET /orders/{reservationId} і віддає замовлення', () => {
    let received: unknown = null;
    service.getOwnerOrder$('res-1').subscribe((order) => (received = order));
    const req = http.expectOne(`${BASE_URL}/orders/res-1`);
    expect(req.request.method).toBe('GET');
    req.flush({ orderId: 'order-1', orderItems: [], status: 0 });
    expect(received).toEqual(jasmine.objectContaining({ orderId: 'order-1' }));
  });

  it('getOwnerOrder$: без замовлення (404) повертає null, а не помилку', () => {
    let received: unknown = 'unset';
    service.getOwnerOrder$('res-1').subscribe((order) => (received = order));
    http.expectOne(`${BASE_URL}/orders/res-1`).flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });
    expect(received).toBeNull();
  });

  it('getStatus$: GET /guest/groups/{id}/status', () => {
    service.getStatus$('grp-1').subscribe();
    const req = http.expectOne(`${BASE_URL}/guest/groups/grp-1/status`);
    expect(req.request.method).toBe('GET');
    req.flush({ currentParticipants: 3, maxCapacity: 5, status: 'Open' });
  });

  it('submit$: POST /group-reservations/{id}/submit з тілом { reservationId }', () => {
    service.submit$('grp-1', 'res-1').subscribe();
    const req = http.expectOne(`${BASE_URL}/group-reservations/grp-1/submit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reservationId: 'res-1' });
    req.flush([]);
  });
});
