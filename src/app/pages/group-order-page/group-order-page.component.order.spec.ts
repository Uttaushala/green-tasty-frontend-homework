// Картка Owner («My Pre-Order») завжди стоїть першою, як у макеті.
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrderPageComponent } from './group-order-page.component';

const INVITE = {
  GroupReservationId: 'grp-1',
  LocationAddress: 'Rustaveli Avenue 48',
  MaxGuestCount: 5,
  StartTime: '2099-10-21T16:00:00Z',
  EndTime: '2026-10-21T17:30:00Z',
} as GuestInvite;

describe('Сторінка Owner Review · порядок карток', () => {
  function renderedTitles(sessions: GroupSessionsResponse): (string | null | undefined)[] {
    const service = jasmine.createSpyObj<GroupOrdersService>('GroupOrdersService', [
      'getGroupInvite$', 'getSessions$', 'getOwnerSessionId$', 'getOwnerOrder$', 'getStatus$',
    ]);
    service.getGroupInvite$.and.returnValue(of(INVITE));
    service.getOwnerSessionId$.and.returnValue(of('owner'));
    service.getOwnerOrder$.and.returnValue(of(null));
    service.getSessions$.and.returnValue(of(sessions));
    service.getStatus$.and.returnValue(of({ currentParticipants: 3, maxCapacity: 5, status: 'Open' as const }));
    TestBed.configureTestingModule({
      imports: [GroupOrderPageComponent],
      providers: [
        { provide: GroupOrdersService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reservationId: 'res-1' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(GroupOrderPageComponent);
    fixture.detectChanges();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('app-participant-card h2')].map((title) => title.textContent);
  }

  it('puts the owner card first even when the server lists guests before the owner', () => {
    const titles = renderedTitles({
      participants: [
        { id: 'olena', type: 'Guest', name: 'Olena', isSubmitted: false, total: 0, items: [] },
        { id: 'owner', type: 'Owner', name: 'Yevhenii', isSubmitted: false, total: 0, items: [] },
        { id: 'maria', type: 'Guest', name: 'Maria', isSubmitted: true, total: 0, items: [] },
      ],
      total: 0,
    });

    expect(titles).toEqual(['My Pre-Order', 'Guest: Olena', 'Guest: Maria']);
  });
});
