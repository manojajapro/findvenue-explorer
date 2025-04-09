
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
  venue_id?: string;
  venue_name?: string;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'message' | 'system';
  read: boolean;
  created_at: string;
  link?: string;
  data?: any;
}

interface MessageContact {
  user_id: string;
  full_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  venue_id?: string;
  venue_name?: string;
  role: string;
}

// Declare the tables to be available to TypeScript
declare module '@supabase/supabase-js' {
  interface Database {
    public: {
      Tables: {
        messages: {
          Row: Message;
          Insert: Omit<Message, 'id' | 'created_at'> & { id?: string; created_at?: string };
          Update: Partial<Omit<Message, 'id'>>;
        };
        notifications: {
          Row: Notification;
          Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string; created_at?: string };
          Update: Partial<Omit<Notification, 'id'>>;
        };
        bookings: {
          Row: {
            booking_date: string
            created_at: string
            end_time: string
            guests: number
            id: string
            special_requests: string | null
            status: string
            total_price: number
            user_id: string
            venue_id: string
            venue_name: string
          }
          Insert: {
            booking_date: string
            created_at?: string
            end_time: string
            guests?: number
            id?: string
            special_requests?: string | null
            start_time: string
            status?: string
            total_price?: number
            user_id: string
            venue_id: string
            venue_name: string
          }
          Update: {
            booking_date?: string
            created_at?: string
            end_time?: string
            guests?: number
            id?: string
            special_requests?: string | null
            start_time?: string
            status?: string
            total_price?: number
            user_id?: string
            venue_id?: string
            venue_name?: string
          }
        };
        user_profiles: {
          Row: {
            created_at: string
            email: string
            favorites: string[] | null
            first_name: string
            id: string
            last_name: string
            phone: string | null
            profile_image: string | null
            updated_at: string
            user_role: string
          }
          Insert: {
            created_at?: string
            email: string
            favorites?: string[] | null
            first_name: string
            id: string
            last_name: string
            phone?: string | null
            profile_image?: string | null
            updated_at?: string
            user_role: string
          }
          Update: {
            created_at?: string
            email?: string
            favorites?: string[] | null
            first_name?: string
            id?: string
            last_name?: string
            phone?: string | null
            profile_image?: string | null
            updated_at?: string
            user_role?: string
          }
        };
        venues: {
          Row: {
            accepted_payment_methods: string[] | null
            accessibility_features: string[] | null
            additional_services: string[] | null
            address: string | null
            amenities: string[] | null
            availability: string[] | null
            category_id: string | null
            category_name: string | null
            city_id: string | null
            city_name: string | null
            created_at: string | null
            currency: string | null
            description: string | null
            featured: boolean | null
            gallery_images: string[] | null
            id: string
            image_url: string | null
            latitude: number | null
            longitude: number | null
            max_capacity: number | null
            min_capacity: number | null
            name: string
            opening_hours: Json | null
            owner_info: Json | null
            parking: boolean | null
            popular: boolean | null
            price_per_person: number | null
            rating: number | null
            reviews_count: number | null
            starting_price: number | null
            updated_at: string | null
            wifi: boolean | null
            rules_and_regulations: Json | null
            type: string | null
            zipcode: string | null
          }
          Insert: {
            accepted_payment_methods?: string[] | null
            accessibility_features?: string[] | null
            additional_services?: string[] | null
            address?: string | null
            amenities?: string[] | null
            availability?: string[] | null
            category_id?: string | null
            category_name?: string | null
            city_id?: string | null
            city_name?: string | null
            created_at?: string | null
            currency?: string | null
            description?: string | null
            featured?: boolean | null
            gallery_images?: string[] | null
            id?: string
            image_url?: string | null
            latitude?: number | null
            longitude?: number | null
            max_capacity?: number | null
            min_capacity?: number | null
            name: string
            opening_hours?: Json | null
            owner_info?: Json | null
            parking?: boolean | null
            popular?: boolean | null
            price_per_person?: number | null
            rating?: number | null
            reviews_count?: number | null
            rules_and_regulations?: Json | null
            starting_price?: number | null
            type?: string | null
            updated_at?: string | null
            wifi?: boolean | null
            zipcode?: string | null
          }
          Update: {
            accepted_payment_methods?: string[] | null
            accessibility_features?: string[] | null
            additional_services?: string[] | null
            address?: string | null
            amenities?: string[] | null
            availability?: string[] | null
            category_id?: string | null
            category_name?: string | null
            city_id?: string | null
            city_name?: string | null
            created_at?: string | null
            currency?: string | null
            description?: string | null
            featured?: boolean | null
            gallery_images?: string[] | null
            id?: string
            image_url?: string | null
            latitude?: number | null
            longitude?: number | null
            max_capacity?: number | null
            min_capacity?: number | null
            name?: string
            opening_hours?: Json | null
            owner_info?: Json | null
            parking?: boolean | null
            popular?: boolean | null
            price_per_person?: number | null
            rating?: number | null
            reviews_count?: number | null
            rules_and_regulations?: Json | null
            starting_price?: number | null
            type?: string | null
            updated_at?: string | null
            wifi?: boolean | null
            zipcode?: string | null
          }
        };
      };
      Views: {
        category_groups: {
          Row: {
            category_id: string | null
            category_name: string | null
            image_url: string | null
            venue_count: number | null
          }
        };
        city_groups: {
          Row: {
            city_id: string | null
            city_name: string | null
            image_url: string | null
            venue_count: number | null
          }
        };
      };
      Functions: {
        get_user_profile: {
          Args: { user_id: string };
          Returns: any;
        };
        get_message_contacts: {
          Args: { current_user_id: string };
          Returns: MessageContact[];
        };
        get_conversation: {
          Args: { current_user_id: string; other_user_id: string };
          Returns: Message[];
        };
      };
    };
  }
}
