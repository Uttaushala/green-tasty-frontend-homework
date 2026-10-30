// Нагадування гостям: URL, метод і тіло запиту.
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { GroupOrdersService } from './group-orders.service';

const BASE_URL = 'https://api.test';

describe('GroupOrdersService · remind$', () => {
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

  it('одному гостю: POST /group-reservations/{id}/reminders з { guestSessionId }', () => {
    service.remind$('grp-1', 'guest-1').subscribe();

    const req = http.expectOne(`${BASE_URL}/group-reservations/grp-1/reminders`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ guestSessionId: 'guest-1' });
    req.flush({ reminded: [], skipped: [] });
  });

  it('всім гостям: порожнє тіло, без guestSessionId', () => {
    service.remind$('grp-1').subscribe();

    const req = http.expectOne(`${BASE_URL}/group-reservations/grp-1/reminders`);
    expect(req.request.body).toEqual({});
    req.flush({ reminded: [], skipped: [] });
  });

  it('повертає відповідь сервера (reminded / skipped)', () => {
    let reminded = 0;
    let skippedReason = '';
    service.remind$('grp-1').subscribe((response) => {
      reminded = response.reminded.length;
      skippedReason = response.skipped[0].reason;
    });

    http.expectOne(`${BASE_URL}/group-reservations/grp-1/reminders`).flush({
      reminded: [{ guestSessionId: 'a', guestName: 'Olena' }],
      skipped: [{ guestSessionId: 'b', guestName: 'Andrii', reason: 'too_soon' }],
    });

    expect(reminded).toBe(1);
    expect(skippedReason).toBe('too_soon');
  });
});
