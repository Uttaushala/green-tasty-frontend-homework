/** POST /group-reservations/{groupReservationId}/reminders — request body (поле необов'язкове: без нього нагадування йде всім). */
export interface RemindGuestsRequest {
  guestSessionId?: string;
}

export type ReminderSkipReason = 'already_submitted' | 'too_soon';

export interface ReminderTarget {
  guestSessionId: string;
  guestName: string;
}

export interface SkippedReminder extends ReminderTarget {
  reason: ReminderSkipReason;
}

/** POST /group-reservations/{groupReservationId}/reminders — response */
export interface RemindGuestsResponse {
  reminded: ReminderTarget[];
  skipped: SkippedReminder[];
}
