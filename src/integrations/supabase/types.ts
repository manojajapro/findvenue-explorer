export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_date: string
          created_at: string
          customer_email: string | null
          customer_phone: string | null
          end_time: string
          guests: number
          id: string
          payment_method: string | null
          special_requests: string | null
          start_time: string
          status: string
          total_price: number
          updated_at: string | null
          user_id: string
          venue_id: string
          venue_name: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          end_time: string
          guests?: number
          id?: string
          payment_method?: string | null
          special_requests?: string | null
          start_time: string
          status?: string
          total_price?: number
          updated_at?: string | null
          user_id: string
          venue_id: string
          venue_name: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          end_time?: string
          guests?: number
          id?: string
          payment_method?: string | null
          special_requests?: string | null
          start_time?: string
          status?: string
          total_price?: number
          updated_at?: string | null
          user_id?: string
          venue_id?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          receiver_name: string | null
          sender_id: string
          sender_name: string | null
          venue_id: string | null
          venue_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          receiver_name?: string | null
          sender_id: string
          sender_name?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          receiver_name?: string | null
          sender_id?: string
          sender_name?: string | null
          venue_id?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
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
        Relationships: []
      }
      venues: {
        Row: {
          accepted_payment_methods: string[] | null
          accessibility_features: string[] | null
          additional_services: string[] | null
          address: string | null
          amenities: string[] | null
          availability: string[] | null
          category_id: string[] | null
          category_name: string[] | null
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
          rules_and_regulations: Json | null
          starting_price: number | null
          status: string | null
          type: string | null
          updated_at: string | null
          wifi: boolean | null
          zipcode: string | null
        }
        Insert: {
          accepted_payment_methods?: string[] | null
          accessibility_features?: string[] | null
          additional_services?: string[] | null
          address?: string | null
          amenities?: string[] | null
          availability?: string[] | null
          category_id?: string[] | null
          category_name?: string[] | null
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
          status?: string | null
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
          category_id?: string[] | null
          category_name?: string[] | null
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
          status?: string | null
          type?: string | null
          updated_at?: string | null
          wifi?: boolean | null
          zipcode?: string | null
        }
        Relationships: []
      }
      venues_v1: {
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
          latitude: number | null
          longitude: number | null
          max_capacity: string | null
          min_capacity: string | null
          name: string
          opening_hours: Json | null
          owner_info: Json | null
          parking: boolean | null
          popular: boolean | null
          price_per_person: number | null
          rating: number | null
          reviews_count: number | null
          rules_and_regulations: Json | null
          starting_price: number | null
          type: string | null
          updated_at: string | null
          wifi: boolean | null
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
          latitude?: number | null
          longitude?: number | null
          max_capacity?: string | null
          min_capacity?: string | null
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
          latitude?: number | null
          longitude?: number | null
          max_capacity?: string | null
          min_capacity?: string | null
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_conversation: {
        Args: { current_user_id: string; other_user_id: string }
        Returns: {
          id: string
          created_at: string
          content: string
          sender_id: string
          receiver_id: string
          read: boolean
          sender_name: string
          receiver_name: string
        }[]
      }
      get_message_contacts: {
        Args: { current_user_id: string }
        Returns: {
          user_id: string
          full_name: string
          last_message: string
          last_message_time: string
          unread_count: number
          venue_id: string
          venue_name: string
          role: string
        }[]
      }
      update_booking_status: {
        Args: { p_booking_id: string; p_status: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
