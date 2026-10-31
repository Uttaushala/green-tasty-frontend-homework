import { markGuestsSeen, readSeenGuests } from './seen-guests';

describe('seen-guests', () => {
  afterEach(() => localStorage.clear());

  it('returns 0 for a reservation nobody has opened', () => {
    expect(readSeenGuests('unknown')).toBe(0);
  });

  it('returns the stored guest count', () => {
    markGuestsSeen('res-1', 3);

    expect(readSeenGuests('res-1')).toBe(3);
  });

  it('returns 0 for a corrupted value', () => {
    localStorage.setItem('seenGuests:res-2', 'abc');

    expect(readSeenGuests('res-2')).toBe(0);
  });
});
