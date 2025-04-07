
export interface Message {
  id: string;
  created_at: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  read: boolean;
  sender_name: string;
  receiver_name: string;
  venue_id?: string;
  venue_name?: string;
  booking_id?: string;
}

export interface ChatContact {
  id: string;
  name: string;
  role?: string;
  image?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  venue_id?: string;
  venue_name?: string;
  status?: string;
}
