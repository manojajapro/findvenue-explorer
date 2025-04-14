
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
  receiver_name?: string;
  venue_id?: string;
  venue_name?: string;
  booking_id?: string;
  read: boolean;
  created_at: string;
}

export interface ChatContact {
  id: string;
  name: string;
  image?: string;
  status?: string; // e.g. "3 unread" or "online"
  role?: string; // e.g. "venue-owner" or "customer"
  venue_id?: string;
  venue_name?: string;
}
