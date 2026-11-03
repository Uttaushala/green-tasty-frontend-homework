// Inline qty stepper + trash on "My Pre-Order" rows while the group is still collecting.
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { PreOrdersService } from '@app/services/pre-orders/pre-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { Order } from '@app/models/orders/order.model';
import { GroupOrderPageComponent } from './group-order-page.component';

const caesar = {
  id: 'dish1',
  name: 'Caesar Salad',
  price: 180,
  imageUrl: 'caesar.jpg',
  state: 'Available',
  weight: '250 g',
  dishType: 'MainCourse',
  description: '',
  calories: '',
  proteins: '',
  carbohydrates: '',
  fats: '',
  vitamins: '',
};
const SESSIONS: GroupSessionsResponse = {
  participants: [
    { id: 'owner', type: 'Owner', name: 'Yevhenii', isSubmitted: true, total: 0, items: [] },
    { id: 'andrii', type: 'Guest', name: 'Andrii', isSubmitted: true, total: 360, items: [{ dish: caesar, quantity: 2 }] },
  ],
  total: 360,
};
const OWNER_ORDER: Order = {
  orderId: 'order-1',
  reservationAddress: 'Rustaveli Avenue 48',
  reservationTime: '2099-10-21T16:00:00Z',
  reservationId: 'res-1',
  status: 0,
  orderItems: [{ dish: caesar, quantity: 2, state: 0 }],
};
const INVITE = { GroupReservationId: 'grp-1', LocationAddress: 'Rustaveli Avenue 48', MaxGuestCount: 5,
  StartTime: '2099-10-21T16:00:00Z', EndTime: '2026-10-21T17:30:00Z' } as GuestInvite;

describe('Inline qty stepper + trash on My Pre-Order', () => {
  let groupService: jasmine.SpyObj<GroupOrdersService>;
  let preOrdersService: jasmine.SpyObj<PreOrdersService>;

  function create() {
    TestBed.configureTestingModule({
      imports: [GroupOrderPageComponent],
      providers: [
        { provide: GroupOrdersService, useValue: groupService },
        { provide: PreOrdersService, useValue: preOrdersService },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error', 'info']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reservationId: 'res-1' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(GroupOrderPageComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function ownerCard(element: HTMLElement): HTMLElement {
    return [...element.querySelectorAll('app-participant-card')].find((card) =>
      card.textContent?.includes('My Pre-Order'),
    ) as HTMLElement;
  }

  function guestCard(element: HTMLElement): HTMLElement {
    return [...element.querySelectorAll('app-participant-card')].find((card) =>
      card.textContent?.includes('Andrii'),
    ) as HTMLElement;
  }

  beforeEach(() => {
    groupService = jasmine.createSpyObj<GroupOrdersService>('GroupOrdersService', [
      'getGroupInvite$', 'getSessions$', 'getOwnerSessionId$', 'getOwnerOrder$', 'getStatus$',
      'setGuestDishQuantity$', 'removeGuestDish$',
    ]);
    groupService.getGroupInvite$.and.returnValue(of(INVITE));
    groupService.getSessions$.and.returnValue(of(structuredClone(SESSIONS)));
    groupService.getOwnerSessionId$.and.returnValue(of('owner'));
    groupService.getOwnerOrder$.and.returnValue(of(structuredClone(OWNER_ORDER)));
    groupService.getStatus$.and.returnValue(of({ currentParticipants: 2, maxCapacity: 5, status: 'Open' as const }));

    preOrdersService = jasmine.createSpyObj<PreOrdersService>('PreOrdersService', ['editPreOrderByReservationId']);
  });

  it('My Pre-Order shows a trash icon and a +/- stepper, not "Qty: n"', () => {
    const { element } = create();
    const card = ownerCard(element);

    expect(card.querySelector('.item-delete')).toBeTruthy();
    expect(card.querySelector('.stepper')).toBeTruthy();
    expect(card.querySelector('.qty')).toBeFalsy();
  });

  it('a guest row also shows a trash icon and a +/- stepper, not "Qty: n"', () => {
    const { element } = create();
    const card = guestCard(element);

    expect(card.querySelector('.item-delete')).toBeTruthy();
    expect(card.querySelector('.stepper')).toBeTruthy();
    expect(card.querySelector('.qty')).toBeFalsy();
  });

  it('"+" on a guest row PUTs the owner-only endpoint and refreshes the list from the response', () => {
    const updated: GroupSessionsResponse = {
      participants: [
        SESSIONS.participants[0],
        { ...SESSIONS.participants[1], items: [{ dish: caesar, quantity: 3 }], total: 540 },
      ],
      total: 540,
    };
    groupService.setGuestDishQuantity$.and.returnValue(of(updated));
    const { fixture, element } = create();

    guestCard(element).querySelector<HTMLButtonElement>('.icon-button--outlined')!.click();
    fixture.detectChanges();

    expect(groupService.setGuestDishQuantity$).toHaveBeenCalledOnceWith('grp-1', 'andrii', 'dish1', 3);
    expect(guestCard(element).textContent).toContain('3');
  });

  it('trash on a guest row removes the dish via the owner-only endpoint', () => {
    const updated: GroupSessionsResponse = {
      participants: [SESSIONS.participants[0], { ...SESSIONS.participants[1], items: [], total: 0 }],
      total: 0,
    };
    groupService.removeGuestDish$.and.returnValue(of(updated));
    const { fixture, element } = create();

    guestCard(element).querySelector<HTMLButtonElement>('.item-delete')!.click();
    fixture.detectChanges();

    expect(groupService.removeGuestDish$).toHaveBeenCalledOnceWith('grp-1', 'andrii', 'dish1');
    expect(guestCard(element).textContent).not.toContain('Caesar Salad');
  });

  it('a failed guest-row request leaves the row usable again (button re-enabled, no crash)', () => {
    groupService.setGuestDishQuantity$.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const { fixture, element } = create();

    guestCard(element).querySelector<HTMLButtonElement>('.icon-button--outlined')!.click();
    fixture.detectChanges();

    expect(guestCard(element).querySelector<HTMLButtonElement>('.icon-button--outlined')!.disabled).toBeFalse();
  });

  it('"+" PUTs the owner order with the quantity incremented and reloads the page', () => {
    preOrdersService.editPreOrderByReservationId.and.returnValue(of({}));
    const { fixture, element } = create();

    ownerCard(element).querySelector<HTMLButtonElement>('.icon-button--outlined')!.click();
    fixture.detectChanges();

    expect(preOrdersService.editPreOrderByReservationId).toHaveBeenCalledOnceWith('res-1', {
      ...OWNER_ORDER,
      orderItems: [{ dish: caesar, quantity: 3, state: 0 }],
    });
    expect(groupService.getSessions$).toHaveBeenCalledTimes(2);
  });

  it('"-" is disabled once quantity reaches 1', () => {
    groupService.getOwnerOrder$.and.returnValue(
      of({ ...OWNER_ORDER, orderItems: [{ dish: caesar, quantity: 1, state: 0 }] }),
    );
    const { element } = create();

    expect(ownerCard(element).querySelector<HTMLButtonElement>('.stepper-decrement')!.disabled).toBeTrue();
  });

  it('trash removes the dish from the owner order', () => {
    preOrdersService.editPreOrderByReservationId.and.returnValue(of({}));
    const { fixture, element } = create();

    ownerCard(element).querySelector<HTMLButtonElement>('.item-delete')!.click();
    fixture.detectChanges();

    expect(preOrdersService.editPreOrderByReservationId).toHaveBeenCalledOnceWith('res-1', {
      ...OWNER_ORDER,
      orderItems: [],
    });
  });

  it('a failed PUT leaves the row usable again (button re-enabled, no crash)', () => {
    preOrdersService.editPreOrderByReservationId.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const { fixture, element } = create();

    ownerCard(element).querySelector<HTMLButtonElement>('.icon-button--outlined')!.click();
    fixture.detectChanges();

    expect(ownerCard(element).querySelector<HTMLButtonElement>('.icon-button--outlined')!.disabled).toBeFalse();
  });
});
