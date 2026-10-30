export interface GuestSessionStateResponse {
    name: string;
    isSubmitted: boolean;
    /** UTC time of the last reminder sent by the owner, or null if none. */
    reminderAt: string | null;
}
