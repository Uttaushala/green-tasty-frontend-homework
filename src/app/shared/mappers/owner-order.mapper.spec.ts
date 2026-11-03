import { Participant } from '@app/models/group-orders/participant.model';
import { Order } from '@app/models/orders/order.model';
import { withOwnerOrder } from './owner-order.mapper';

describe('withOwnerOrder', () => {
  const owner: Participant = { id: 'owner-session', type: 'Owner', name: 'Owner', items: [], total: 0, isSubmitted: false };
  const guest: Participant = {
    id: 'guest-session',
    type: 'Guest',
    name: 'Alex',
    items: [{ dish: { id: 'dish-2', name: 'Soup', price: 8 }, quantity: 1 }],
    total: 8,
    isSubmitted: true,
  };

  function buildOrder(status: number, states: number[] = [0, 0]): Order {
    return {
      orderId: 'order-1',
      reservationId: 'reservation-1',
      reservationAddress: 'Rustaveli Avenue 48',
      reservationTime: 'Nov 5, 2026',
      status,
      orderItems: [
        { dish: { id: 'dish-1', name: 'Spring Salad', price: 12, imageUrl: 'a.jpg', weight: '200 g' } as never, quantity: 2, state: states[0] },
        { dish: { id: 'dish-3', name: 'Tea', price: 3, imageUrl: 'b.jpg', weight: '300 ml' } as never, quantity: 1, state: states[1] },
      ],
    };
  }

  it('returns the participants untouched when the owner has no order', () => {
    const participants = [owner, guest];

    expect(withOwnerOrder(participants, null)).toBe(participants);
  });

  it('fills the empty owner with the dishes of the order and sums them up', () => {
    const result = withOwnerOrder([owner, guest], buildOrder(0));

    expect(result[0].items.map((item) => item.dish.name)).toEqual(['Spring Salad', 'Tea']);
    expect(result[0].total).toBe(27);
    expect(result[1]).toBe(guest);
  });

  it('marks the owner as submitted when the order has been sent', () => {
    expect(withOwnerOrder([owner], buildOrder(3))[0].isSubmitted).toBeTrue();
    expect(withOwnerOrder([owner], buildOrder(1))[0].isSubmitted).toBeTrue();
  });

  it('keeps the owner as still choosing while the order is only created', () => {
    expect(withOwnerOrder([owner], buildOrder(0))[0].isSubmitted).toBeFalse();
  });

  it('skips dishes rejected by the waiter', () => {
    const result = withOwnerOrder([owner], buildOrder(1, [0, 2]));

    expect(result[0].items.map((item) => item.dish.name)).toEqual(['Spring Salad']);
    expect(result[0].total).toBe(24);
  });

  it('leaves the owner alone when the order has no dishes', () => {
    const empty = { ...buildOrder(0), orderItems: [] };

    expect(withOwnerOrder([owner], empty)[0]).toBe(owner);
  });

  it('does not overwrite dishes the owner already has in the session', () => {
    const busyOwner: Participant = { ...owner, items: [{ dish: { id: 'x', name: 'Own', price: 5 }, quantity: 1 }], total: 5 };

    expect(withOwnerOrder([busyOwner], buildOrder(0))[0]).toBe(busyOwner);
  });
});
