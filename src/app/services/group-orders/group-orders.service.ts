import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { SKIP_ERROR_TOAST } from '@app/auth/skip-error-toast.context';
import { GroupSessionsResponse } from '@app/models/group-orders/group-sessions-response.model';
import { RemindGuestsRequest, RemindGuestsResponse } from '@app/models/group-orders/remind-guests.model';
import { PreOrderProgress } from '@app/models/group-orders/pre-order-progress.model';
import { GroupStatusResponse } from '@app/models/group-orders/group-status.model';
import { OwnerSessionResponse } from '@app/models/group-orders/owner-session.model';
import { SubmitGroupPreOrderRequest, SubmittedDish } from '@app/models/group-orders/submit-group-pre-order.model';
import { GroupInviteToken, GuestInvite } from '@app/models/reservations/guest-invite.model';
import { API_BASE_URL } from '@app/shared/config/api-base-url.token';

export interface GroupRequestOptions {
  /** Тихий запит (фонова синхронізація): помилка не показується toast-ом. */
  silent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GroupOrdersService {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);

  /**
   * reservationId → invite-token → invite (з нього беремо GroupReservationId і дані шапки).
   * Публічний invite недоступний, коли група заповнена або вже відправлена, —
   * тоді owner-ендпоїнт повертає ті самі дані без обмежень гостьового флоу.
   */
  getGroupInvite$(reservationId: string): Observable<GuestInvite> {
    const quiet = this.context({ silent: true });
    const encodedId = encodeURIComponent(reservationId);
    return this.http
      .get<GroupInviteToken>(`${this.baseUrl}/reservations/${encodedId}/invite-token`, { context: quiet })
      .pipe(
        switchMap((response) =>
          this.http.get<GuestInvite>(`${this.baseUrl}/guest/invites/${encodeURIComponent(response.token)}`, {
            context: quiet,
          }),
        ),
        catchError(() => this.http.get<GuestInvite>(`${this.baseUrl}/reservations/${encodedId}/group-reservation`)),
      );
  }

  getSessions$(groupReservationId: string, options?: GroupRequestOptions): Observable<GroupSessionsResponse> {
    return this.http.get<GroupSessionsResponse>(`${this.groupUrl(groupReservationId)}/sessions`, {
      context: this.context(options),
    });
  }

  /** Quiet progress lookup for the reservation card; null when the reservation has no group. */
  getPreOrderProgress$(reservationId: string): Observable<PreOrderProgress | null> {
    return this.http
      .get<GuestInvite>(`${this.baseUrl}/reservations/${encodeURIComponent(reservationId)}/group-reservation`, {
        context: this.context({ silent: true }),
      })
      .pipe(
        switchMap((invite) => this.getSessions$(invite.GroupReservationId, { silent: true })),
        map((sessions) => ({
          submitted: sessions.participants.filter((person) => person.isSubmitted).length,
          guestsJoined: sessions.participants.filter((person) => person.type === 'Guest').length,
        })),
        catchError(() => of(null)),
      );
  }

  getOwnerSessionId$(reservationId: string): Observable<string> {
    return this.http
      .get<OwnerSessionResponse>(`${this.baseUrl}/reservations/${encodeURIComponent(reservationId)}/guest-session-id`)
      .pipe(map((response) => response.guestSessionId));
  }

  getStatus$(groupReservationId: string, options?: GroupRequestOptions): Observable<GroupStatusResponse> {
    return this.http.get<GroupStatusResponse>(`${this.groupUrl(groupReservationId)}/status`, {
      context: this.context(options),
    });
  }

  submit$(groupReservationId: string, reservationId: string): Observable<SubmittedDish[]> {
    const body: SubmitGroupPreOrderRequest = { reservationId };
    return this.http.post<SubmittedDish[]>(
      `${this.baseUrl}/group-reservations/${encodeURIComponent(groupReservationId)}/submit`,
      body,
    );
  }

  /** Owner видаляє сесію гостя; у відповіді — оновлений список учасників. */
  removeSession$(groupReservationId: string, guestSessionId: string): Observable<GroupSessionsResponse> {
    return this.http.delete<GroupSessionsResponse>(
      `${this.groupUrl(groupReservationId)}/sessions/${encodeURIComponent(guestSessionId)}`,
    );
  }

  /** Owner нагадує гостям, які ще не підтвердили кошик: одному (guestSessionId) або всім одразу. */
  remind$(groupReservationId: string, guestSessionId?: string): Observable<RemindGuestsResponse> {
    const body: RemindGuestsRequest = guestSessionId ? { guestSessionId } : {};
    return this.http.post<RemindGuestsResponse>(
      `${this.baseUrl}/group-reservations/${encodeURIComponent(groupReservationId)}/reminders`,
      body,
    );
  }

  private groupUrl(groupReservationId: string): string {
    return `${this.baseUrl}/guest/groups/${encodeURIComponent(groupReservationId)}`;
  }

  private context(options?: GroupRequestOptions): HttpContext {
    return new HttpContext().set(SKIP_ERROR_TOAST, options?.silent ?? false);
  }
}
