// Менше 30 хвилин до броні: сторінка лише для перегляду (бекенд все одно відхилить зміни).
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrderPageComponent, MODIFICATION_CUTOFF_MS } from './group-order-page.component';

const DISH = { id: 'd1', name: 'Soup', price: 10 } as GroupSessionsResponse['participants'][number]['items'][number]['dish'];
const SESSIONS: GroupSessionsResponse = {
  participants: [
    { id: 'owner', type: 'Owner', name: 'Owner', isSubmitted: true, total: 10, items: [{ dish: DISH, quantity: 1 }] },
    { id: 'olena', type: 'Guest', name: 'Olena', isSubmitted: false, total: 0, items: [] },
  ],
  total: 10,
};
const NOTE = 'Less than 30 minutes before the reservation time. No changes can be applied.';

describe('Сторінка Owner Review · режим перегляду (<30 хв)', () => {
  function create(startOffsetMs: number) {
    const start = new Date(Date.now() + startOffsetMs).toISOString();
    const service = jasmine.createSpyObj<GroupOrdersService>('GroupOrdersService', [
      'getGroupInvite$', 'getSessions$', 'getOwnerSessionId$', 'getOwnerOrder$', 'getStatus$', 'submit$', 'remind$', 'removeSession$',
    ]);
    service.getGroupInvite$.and.returnValue(
      of({ GroupReservationId: 'grp-1', LocationAddress: 'Addr', MaxGuestCount: 5, StartTime: start, EndTime: start } as GuestInvite),
    );
    service.getSessions$.and.returnValue(of(structuredClone(SESSIONS)));
    service.getOwnerSessionId$.and.returnValue(of('owner'));
    service.getOwnerOrder$.and.returnValue(of(null));
    service.getStatus$.and.returnValue(of({ currentParticipants: 2, maxCapacity: 5, status: 'Open' as const }));
    TestBed.configureTestingModule({
      imports: [GroupOrderPageComponent],
      providers: [
        { provide: GroupOrdersService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reservationId: 'res-1' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(GroupOrderPageComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, component: fixture.componentInstance, service };
  }

  it('за 29 хвилин до початку показує червону плашку з текстом з макета', () => {
    const { element } = create(MODIFICATION_CUTOFF_MS - 60_000);
    const note = element.querySelector('.notice--locked');
    expect(note?.textContent?.trim()).toBe(NOTE);
  });

  it('у режимі перегляду немає Submit, Remind і Remove', () => {
    const { element } = create(10 * 60_000);
    const texts = [...element.querySelectorAll('button')].map((btn) => btn.textContent?.trim());
    expect(texts).not.toContain('Submit Pre-Order');
    expect(texts).not.toContain('Remind all');
    expect(element.querySelector('button.remind')).toBeNull();
    expect(element.querySelector('.remove')).toBeNull();
  });

  it('askRemoveGuest у режимі перегляду нічого не відкриває', () => {
    const { component } = create(10 * 60_000);
    component.askRemoveGuest(component.participants()[1]);
    expect(component.guestToRemove()).toBeNull();
  });

  it('вже розпочата бронь теж лише для перегляду', () => {
    const { component } = create(-5 * 60_000);
    expect(component.viewMode()).toBeTrue();
  });

  it('за 31 хвилину до початку працює як раніше: є Submit і немає плашки', () => {
    const { element, component } = create(MODIFICATION_CUTOFF_MS + 60_000);
    expect(component.viewMode()).toBeFalse();
    expect(element.querySelector('.notice--locked')).toBeNull();
    const texts = [...element.querySelectorAll('button')].map((btn) => btn.textContent?.trim());
    expect(texts).toContain('Submit Pre-Order');
  });
});
