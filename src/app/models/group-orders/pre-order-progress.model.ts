/** How many guests of a reservation have submitted their pre-order. */
export interface PreOrderProgress {
  /** Participants (owner included) whose cart is submitted. */
  submitted: number;
  /** The owner's own group session is submitted (the owner's regular order is tracked separately). */
  ownerSubmitted: boolean;
  /** Guests (owner excluded) who have joined the group. */
  guestsJoined: number;
}
