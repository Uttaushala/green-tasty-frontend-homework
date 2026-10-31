// «Group Pre-Order» відкривається вікном поверх списку бронювань: хрестик, фон і Escape повертають до списку.
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrderPageComponent } from './group-order-page.component';

const INVITE = {
  GroupReservationId: 'grp-1',
  LocationAddress: 'Rustaveli Avenue 48',
  MaxGuestCount: 5,
  StartTime: '2099-10-21T16:00:00Z',
  EndTime: '2026-10-21T17:30:00Z',
} as GuestInvite;

describe('Сторінка Owner Review · вікно', () => {
  let navigate: jasmine.Spy;

  function create() {
    const service = jasmine.createSpyObj<GroupOrdersService>('GroupOrdersService', [
      'getGroupInvite$', 'getSessions$', 'getOwnerSessionId$', 'getStatus$',
    ]);
    service.getGroupInvite$.and.returnValue(of(INVITE));
    service.getOwnerSessionId$.and.returnValue(of('owner'));
    service.getSessions$.and.returnValue(of({
      participants: [
        { id: 'owner', type: 'Owner' as const, name: 'Yevhenii', isSubmitted: true, total: 0, items: [] },
        { id: 'olena', type: 'Guest' as const, name: 'Olena', isSubmitted: true, total: 0, items: [] },
      ],
      total: 0,
    }));
    service.getStatus$.and.returnValue(of({ currentParticipants: 2, maxCapacity: 5, status: 'Open' as const }));
    TestBed.configureTestingModule({
      imports: [GroupOrderPageComponent],
      providers: [
        { provide: GroupOrdersService, useValue: service },
        { provide: ToastService, useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reservationId: 'res-1' }) } } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(GroupOrderPageComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function pressEscape(): void {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  }

  it('returns to the reservations list when the close button is clicked', () => {
    const { element } = create();

    element.querySelector<HTMLButtonElement>('button.close')!.click();

    expect(navigate).toHaveBeenCalledOnceWith(['/reservations']);
  });

  it('returns to the list when the dimmed background is clicked', () => {
    const { element } = create();

    element.click();

    expect(navigate).toHaveBeenCalledOnceWith(['/reservations']);
  });

  it('stays open when the window itself is clicked', () => {
    const { element } = create();

    element.querySelector<HTMLElement>('.page')!.click();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('returns to the list on Escape', () => {
    create();

    pressEscape();

    expect(navigate).toHaveBeenCalledOnceWith(['/reservations']);
  });

  it('keeps the window open on Escape while a confirmation dialog is open', () => {
    const { fixture, element } = create();
    [...element.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Remove Guest')!.click();
    fixture.detectChanges();

    pressEscape();

    expect(navigate).not.toHaveBeenCalled();
  });
});
