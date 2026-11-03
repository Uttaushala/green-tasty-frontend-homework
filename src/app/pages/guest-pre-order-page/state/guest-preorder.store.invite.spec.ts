import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GuestInviteService } from '@app/services/reservation/guest-invite.service';
import { GuestSessionsService } from '@app/services/guest-sessions/guest-sessions.service';
import { GuestPreorderStore } from './guest-preorder.store';

describe('GuestPreorderStore invite loading', () => {
    const TOKEN = 'invite-token';
    const invite: GuestInvite = {
        GroupReservationId: 'group-1',
        LocationId: 'location-1',
        RestaurantName: 'Green & Tasty',
        LocationAddress: 'Rustaveli Avenue 48',
        StartTime: '2026-11-01T18:00:00Z',
        EndTime: '2026-11-01T19:30:00Z',
        MaxGuestCount: 2,
        TableNumber: 4,
        InviterName: 'Owner',
    };
    const limitExceeded = () =>
        throwError(
            () =>
                new HttpErrorResponse({
                    status: 400,
                    error: { message: 'Guest limit exceeded for this reservation.', errorCode: 'GuestLimitExceeded' },
                }),
        );

    let store: GuestPreorderStore;
    let invites: jasmine.SpyObj<GuestInviteService>;

    beforeEach(() => {
        localStorage.clear();
        invites = jasmine.createSpyObj<GuestInviteService>('GuestInviteService', ['getInvite$']);
        TestBed.configureTestingModule({
            providers: [
                { provide: GuestInviteService, useValue: invites },
                { provide: GuestSessionsService, useValue: jasmine.createSpyObj('GuestSessionsService', ['getMenu']) },
            ],
        });
        store = TestBed.inject(GuestPreorderStore);
    });

    afterEach(() => localStorage.clear());

    it('loads the invite and keeps a copy for the next visit', async () => {
        invites.getInvite$.and.returnValue(of(invite));

        await store.loadInviteByToken(TOKEN);

        expect(store.invite()).toEqual(invite);
        expect(store.inviteError()).toBeNull();
        expect(localStorage.getItem(`guestPreorder:${TOKEN}:invite`)).toBe(JSON.stringify(invite));
    });

    it('lets a guest who already joined back in when the group is full', async () => {
        invites.getInvite$.and.returnValue(of(invite));
        await store.loadInviteByToken(TOKEN);
        store.guestSessionId.set('session-1');
        store.guestSessionToken.set('token-1');
        invites.getInvite$.and.returnValue(limitExceeded());

        await store.loadInviteByToken(TOKEN);

        expect(store.invite()).toEqual(invite);
        expect(store.inviteError()).toBeNull();
        expect(invites.getInvite$).toHaveBeenCalledWith(TOKEN, true);
    });

    it('tells a new visitor that the reservation is full', async () => {
        invites.getInvite$.and.returnValue(limitExceeded());

        await store.loadInviteByToken(TOKEN);

        expect(store.invite()).toBeNull();
        expect(store.inviteError()).toBe('full');
    });

    it('does not use a saved invite for a visitor without a session', async () => {
        invites.getInvite$.and.returnValue(of(invite));
        await store.loadInviteByToken(TOKEN);
        invites.getInvite$.and.returnValue(limitExceeded());

        await store.loadInviteByToken(TOKEN);

        expect(store.inviteError()).toBe('full');
    });

    it('keeps the retry state for a server error', async () => {
        invites.getInvite$.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

        await store.loadInviteByToken(TOKEN);

        expect(store.inviteError()).toBe('retryable');
    });

    it('marks a missing invite as expired', async () => {
        invites.getInvite$.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

        await store.loadInviteByToken(TOKEN);

        expect(store.inviteError()).toBe('expired');
    });
});
