import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GuestInviteService } from '@app/services/reservation/guest-invite.service';
import { GuestSessionsService } from '@app/services/guest-sessions/guest-sessions.service';
import { GuestPreorderStore } from './guest-preorder.store';

describe('GuestPreorderStore createNewPreorder', () => {
    const TOKEN = 'invite-token';
    const invite: GuestInvite = {
        GroupReservationId: 'group-1',
        LocationId: 'location-1',
        RestaurantName: 'Green & Tasty',
        LocationAddress: 'Rustaveli Avenue 48',
        StartTime: '2026-11-01T18:00:00Z',
        EndTime: '2026-11-01T19:30:00Z',
        MaxGuestCount: 4,
        TableNumber: 4,
        InviterName: 'Owner',
    };

    let store: GuestPreorderStore;
    let sessions: jasmine.SpyObj<GuestSessionsService>;

    beforeEach(() => {
        localStorage.clear();
        const invites = jasmine.createSpyObj<GuestInviteService>('GuestInviteService', ['getInvite$']);
        invites.getInvite$.and.returnValue(of(invite));
        sessions = jasmine.createSpyObj<GuestSessionsService>('GuestSessionsService', ['createSession', 'getMenu']);
        sessions.getMenu.and.returnValue(of({ dishes: {} }));

        TestBed.configureTestingModule({
            providers: [
                { provide: GuestInviteService, useValue: invites },
                { provide: GuestSessionsService, useValue: sessions },
            ],
        });
        store = TestBed.inject(GuestPreorderStore);
    });

    afterEach(() => localStorage.clear());

    it('passes the guest\'s own submitted session as replacesGuestSessionId, so it is not double-counted against the guest limit', async () => {
        store.initContext(TOKEN);
        await store.loadInviteByToken(TOKEN);
        store.guestName.set('Jasmine');
        store.guestSessionId.set('session-old');
        store.guestSessionToken.set('token-old');
        store.status.set('submitted');
        sessions.createSession.and.returnValue(of({ SessionId: 'session-new', SessionToken: 'token-new' }));

        await store.createNewPreorder();

        expect(sessions.createSession).toHaveBeenCalledWith({
            groupReservationId: invite.GroupReservationId,
            guestName: 'Jasmine',
            replacesGuestSessionId: 'session-old',
        });
        expect(store.guestSessionId()).toBe('session-new');
        expect(store.status()).toBe('active');
    });

    it('omits replacesGuestSessionId for a guest without a prior session', async () => {
        store.initContext(TOKEN);
        await store.loadInviteByToken(TOKEN);
        store.guestName.set('Jasmine');
        sessions.createSession.and.returnValue(of({ SessionId: 'session-new', SessionToken: 'token-new' }));

        await store.createNewPreorder();

        expect(sessions.createSession).toHaveBeenCalledWith({
            groupReservationId: invite.GroupReservationId,
            guestName: 'Jasmine',
            replacesGuestSessionId: undefined,
        });
    });
});
