import { Participant, ParticipantItem } from '@app/models/group-orders/participant.model';
import { Order } from '@app/models/orders/order.model';

const CANCELED_ITEM_STATE = 2;

/** Order statuses that mean the owner has already sent the pre-order: Submitted and SubmittedByCustomer. */
const SENT_ORDER_STATUSES: readonly number[] = [1, 3];

/**
 * The owner's own pre-order is saved as the reservation's regular order, while the group window lists
 * the owner from a separate guest session that stays empty. Fills "My Pre-Order" from the order
 * when the owner's session has no dishes of its own.
 */
export function withOwnerOrder(participants: Participant[], order: Order | null): Participant[] {
  if (!order) {
    return participants;
  }

  const items: ParticipantItem[] = order.orderItems
    .filter((item) => item.state !== CANCELED_ITEM_STATE)
    .map((item) => ({
      dish: {
        id: item.dish.id,
        name: item.dish.name,
        price: item.dish.price,
        imageUrl: item.dish.imageUrl,
        weight: item.dish.weight,
      },
      quantity: item.quantity,
    }));

  if (items.length === 0) {
    return participants;
  }

  const total = items.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
  const isSubmitted = SENT_ORDER_STATUSES.includes(order.status);

  return participants.map((person) =>
    person.type === 'Owner' && person.items.length === 0 ? { ...person, items, total, isSubmitted } : person,
  );
}
