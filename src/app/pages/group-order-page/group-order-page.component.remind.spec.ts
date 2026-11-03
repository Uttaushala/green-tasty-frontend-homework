// Owner нагадує гостям, які ще не підтвердили кошик.
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { GroupOrdersService } from '@app/services/group-orders/group-orders.service';
import { ToastService } from '@app/services/toast/toast.service';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { RemindGuestsResponse } from '@app/models/group-orders/remind-guests.model';
import { GuestInvite } from '@app/models/reservations/guest-invite.model';
import { GroupOrderPageComponent } from './group-order-page.component';

const SESSIONS: GroupSessionsResponse = {
  participants: [
    { id: 'owner', type: 'Owner', name: 'Yevhenii', isSubmitted: false, total: 0, items: [] },
    { id: 'andrii', type: 'Guest', name: 'Andrii', isSubmitted: true, total: 0, items: [] },
    { id: 'olena', type: 'Guest', name: 'Olena', isSubmitted: false, total: 0, items: [] },
    { id: 'maria', type: 'Guest', name: 'Maria', isSubmitted: false, total: 0, items: [] },
  ],
  total: 0,
};
const INVITE = {
  GroupReservationId: 'grp-1',
  LocationAddress: 'Rustaveli Avenue 48',
  MaxGuestCount: 5,
  StartTime: '2099-10-21T16:00:00Z',
  EndTime: '2026-10-21T17:30:00Z',
} as GuestInvite;

function buttonByText(root: ParentNode, text: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined;
}

describe('Сторінка Owner Review · нагадування', () => {
  let service: jasmine.SpyObj<GroupOrdersService>;
  let toast: jasmine.SpyObj<ToastService>;

  function create(sessions: GroupSessionsResponse = SESSIONS, status: 'Open' | 'Submitted' = 'Open') {
    service.getSessions$.and.returnValue(of(structuredClone(sessions)));
    service.getStatus$.and.returnValue(of({ currentParticipants: 4, maxCapacity: 5, status }));
    TestBed.configureTestingModule({
      imports: [GroupOrderPageComponent],
      providers: [
        { provide: GroupOrdersService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ reservationId: 'res-1' }) } } },
      ],
    });
    const fixture = TestBed.createComponent(GroupOrderPageComponent);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  function remindButtons(element: HTMLElement): HTMLButtonElement[] {
    return [...element.querySelectorAll<HTMLButtonElement>('button.remind')];
  }

  beforeEach(() => {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error', 'info']);
    service = jasmine.createSpyObj<GroupOrdersService>('GroupOrdersService', [
      'getGroupInvite$', 'getSessions$', 'getOwnerSessionId$', 'getOwnerOrder$', 'getStatus$', 'submit$', 'remind$',
    ]);
    service.getGroupInvite$.and.returnValue(of(INVITE));
    service.getOwnerSessionId$.and.returnValue(of('owner'));
    service.getOwnerOrder$.and.returnValue(of(null));
  });

  it('«Remind» є лише в гостей, які ще обирають (не в Owner і не в тих, хто підтвердив)', () => {
    const { element } = create();

    expect(remindButtons(element).length).toBe(2);
    const cards = [...element.querySelectorAll('app-participant-card')];
    const withRemind = cards.filter((card) => card.querySelector('button.remind')).map((card) => card.querySelector('h2')?.textContent);
    expect(withRemind).toEqual(['Guest: Olena', 'Guest: Maria']);
  });

  it('після Submit кнопок нагадування немає', () => {
    const { element } = create(SESSIONS, 'Submitted');

    expect(remindButtons(element).length).toBe(0);
    expect(buttonByText(element, 'Remind all')).toBeUndefined();
  });

  it('«Remind all» не показується, коли всі гості вже підтвердили', () => {
    const allDone = structuredClone(SESSIONS);
    allDone.participants.forEach((person) => (person.isSubmitted = true));
    const { element } = create(allDone);

    expect(buttonByText(element, 'Remind all')).toBeUndefined();
  });

  it('«Remind» біля гостя: remind$(group, guestId) і toast з ім’ям', () => {
    const response: RemindGuestsResponse = { reminded: [{ guestSessionId: 'olena', guestName: 'Olena' }], skipped: [] };
    service.remind$.and.returnValue(of(response));
    const { fixture, element } = create();

    remindButtons(element)[0].click();
    fixture.detectChanges();

    expect(service.remind$).toHaveBeenCalledOnceWith('grp-1', 'olena');
    expect(toast.success).toHaveBeenCalledWith('Reminder sent to Olena');
  });

  it('«Remind all»: remind$(group) без гостя і toast з кількістю', () => {
    const response: RemindGuestsResponse = {
      reminded: [
        { guestSessionId: 'olena', guestName: 'Olena' },
        { guestSessionId: 'maria', guestName: 'Maria' },
      ],
      skipped: [],
    };
    service.remind$.and.returnValue(of(response));
    const { element } = create();

    buttonByText(element, 'Remind all')?.click();

    expect(service.remind$).toHaveBeenCalledOnceWith('grp-1', undefined);
    expect(toast.success).toHaveBeenCalledWith('Reminder sent to 2 guests');
  });

  it('too_soon: показує, що нагадування вже було щойно', () => {
    const response: RemindGuestsResponse = {
      reminded: [],
      skipped: [{ guestSessionId: 'olena', guestName: 'Olena', reason: 'too_soon' }],
    };
    service.remind$.and.returnValue(of(response));
    const { element } = create();

    remindButtons(element)[0].click();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('Olena was reminded less than 2 minutes ago');
  });

  it('поки запит іде, повторний клік не відправляє другий запит', () => {
    const pending$ = new Subject<RemindGuestsResponse>();
    service.remind$.and.returnValue(pending$);
    const { fixture, element } = create();

    remindButtons(element)[0].click();
    fixture.detectChanges();
    remindButtons(element)[0].click();
    buttonByText(element, 'Remind all')?.click();

    expect(service.remind$).toHaveBeenCalledTimes(1);
    expect(buttonByText(element, 'Sending…')).toBeDefined();
  });

  it('помилка запиту: кнопку можна натиснути знову, success-toast немає', () => {
    service.remind$.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const { fixture, element } = create();

    remindButtons(element)[0].click();
    fixture.detectChanges();

    expect(toast.success).not.toHaveBeenCalled();
    expect(remindButtons(element)[0].disabled).toBeFalse();
  });
});
