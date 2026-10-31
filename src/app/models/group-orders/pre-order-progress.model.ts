/** How many guests of a reservation have submitted their pre-order. */
export interface PreOrderProgress {
  /** Participants (owner included) whose cart is submitted. */
  submitted: number;
  /** Guests (owner excluded) who have joined the group. */
  guestsJoined: number;
}
