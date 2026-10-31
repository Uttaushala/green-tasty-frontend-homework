import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestInviteService } from '@app/services/reservation/guest-invite.service';
import { GuestSessionsService } from '@app/services/guest-sessions/guest-sessions.service';
import { GuestPreorderStore } from './guest-preorder.store';

describe('GuestPreorderStore expired session', () => {
    const failure = (status: number) =>
        throwError(() => new HttpErrorResponse({ status })) as unknown as ReturnType<GuestSessionsService['getMenu']>;

    let store: GuestPreorderStore;
    let sessions: jasmine.SpyObj<GuestSessionsService>;

    beforeEach(() => {
        localStorage.clear();
        sessions = jasmine.createSpyObj<GuestSessionsService>('GuestSessionsService', ['getMenu']);
        TestBed.configureTestingModule({
            providers: [
                { provide: GuestSessionsService, useValue: sessions },
                { provide: GuestInviteService, useValue: jasmine.createSpyObj('GuestInviteService', ['getInvite$']) },
            ],
        });
        store = TestBed.inject(GuestPreorderStore);
        store.guestSessionId.set('session-1');
        store.guestSessionToken.set('token-1');
    });

    afterEach(() => localStorage.clear());

    it('forgets the saved session and asks to rejoin when the server answers 401', async () => {
        sessions.getMenu.and.returnValue(failure(401));

        await store.loadMenu();

        expect(store.guestSessionId()).toBeNull();
        expect(store.guestSessionToken()).toBeNull();
        expect(store.menuError()).toBe('Your guest session has expired. Please rejoin the reservation.');
    });

    it('keeps the session on a temporary server error', async () => {
        sessions.getMenu.and.returnValue(failure(500));

        await store.loadMenu();

        expect(store.guestSessionId()).toBe('session-1');
        expect(store.menuError()).toBe('Failed to load menu');
    });

    it('loads the menu with a valid session', async () => {
        sessions.getMenu.and.returnValue(
            of({ dishes: { Appetizers: [] } }) as unknown as ReturnType<GuestSessionsService['getMenu']>,
        );

        await store.loadMenu();

        expect(store.menuError()).toBeNull();
        expect(Object.keys(store.menuByCategory())).toEqual(['Appetizers']);
    });
});
