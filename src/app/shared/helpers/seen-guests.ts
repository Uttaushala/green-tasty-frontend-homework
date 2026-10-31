const STORAGE_PREFIX = 'seenGuests:';

export function readSeenGuests(reservationId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + reservationId);
    const value = raw === null ? 0 : Number(raw);

    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function markGuestsSeen(reservationId: string, guests: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + reservationId, String(guests));
  } catch {
    // storage unavailable: the dot simply stays visible
  }
}
