
export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender_name?: string;
  receiver_name?: string;
  venue_id?: string;
  venue_name?: string;
  booking_id?: string; // Added to link messages with specific bookings
};

export type ChatContact = {
  id: string;
  name: string;
  image?: string;
  role?: 'venue-owner' | 'customer';
  status?: string;
  venue_id?: string;
  venue_name?: string; // Changed from venueName to be consistent
  booking_id?: string; // Added to link contacts with specific bookings
};
