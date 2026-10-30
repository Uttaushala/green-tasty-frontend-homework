import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestInviteService } from '@app/services/reservation/guest-invite.service';
import { GuestSessionsService } from '@app/services/guest-sessions/guest-sessions.service';
import { GuestPreorderStore } from './guest-preorder.store';

describe('GuestPreorderStore reminders', () => {
    const REMINDER = '2026-10-30T15:00:00Z';
    let store: GuestPreorderStore;
    let sessions: jasmine.SpyObj<GuestSessionsService>;

    function state(reminderAt: string | null) {
        return of({ name: 'Olena', isSubmitted: false, reminderAt });
    }

    beforeEach(() => {
        localStorage.clear();
        sessions = jasmine.createSpyObj<GuestSessionsService>('GuestSessionsService', ['getSessionState']);
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

    it('shows no reminder when the owner has not reminded', async () => {
        sessions.getSessionState.and.returnValue(state(null));
        await store.refreshReminder();
        expect(store.hasReminder()).toBeFalse();
    });

    it('shows the reminder when the server returns reminderAt', async () => {
        sessions.getSessionState.and.returnValue(state(REMINDER));
        await store.refreshReminder();
        expect(sessions.getSessionState).toHaveBeenCalledWith('session-1', 'token-1');
        expect(store.hasReminder()).toBeTrue();
    });

    it('hides the reminder after dismiss and shows it again for a newer one', async () => {
        sessions.getSessionState.and.returnValue(state(REMINDER));
        await store.refreshReminder();
        store.dismissReminder();
        expect(store.hasReminder()).toBeFalse();

        await store.refreshReminder();
        expect(store.hasReminder()).toBeFalse();

        sessions.getSessionState.and.returnValue(state('2026-10-30T15:05:00Z'));
        await store.refreshReminder();
        expect(store.hasReminder()).toBeTrue();
    });

    it('does not call the API without a guest session', async () => {
        store.guestSessionToken.set(null);
        await store.refreshReminder();
        expect(sessions.getSessionState).not.toHaveBeenCalled();
    });

    it('keeps the current state when polling fails', async () => {
        sessions.getSessionState.and.returnValue(state(REMINDER));
        await store.refreshReminder();
        sessions.getSessionState.and.returnValue(throwError(() => new Error('offline')));
        await store.refreshReminder();
        expect(store.hasReminder()).toBeTrue();
    });

    it('hides the reminder once the pre-order is submitted', async () => {
        sessions.getSessionState.and.returnValue(state(REMINDER));
        await store.refreshReminder();
        store.status.set('submitted');
        expect(store.hasReminder()).toBeFalse();
    });
});
