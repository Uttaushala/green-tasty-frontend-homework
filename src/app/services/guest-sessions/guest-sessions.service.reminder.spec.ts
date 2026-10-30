import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SKIP_ERROR_TOAST } from '@app/auth/skip-error-toast.context';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';
import { GuestSessionsService } from './guest-sessions.service';

describe('GuestSessionsService.getSessionState', () => {
    const baseUrl = 'https://api.test';
    let service: GuestSessionsService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: baseUrl },
            ],
        });
        service = TestBed.inject(GuestSessionsService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('sends GET with the guest bearer token and silences error toasts', () => {
        let reminderAt: string | null | undefined;
        service.getSessionState('session-1', 'secret').subscribe(state => (reminderAt = state.reminderAt));

        const req = httpMock.expectOne(`${baseUrl}/guest/sessions/session-1`);
        expect(req.request.method).toBe('GET');
        expect(req.request.headers.get('Authorization')).toBe('Bearer secret');
        expect(req.request.context.get(SKIP_ERROR_TOAST)).toBeTrue();

        req.flush({ name: 'Olena', isSubmitted: false, reminderAt: '2026-10-30T15:00:00Z' });
        expect(reminderAt).toBe('2026-10-30T15:00:00Z');
    });
});
