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
          end_time: string
          guests: number
          id: string
          special_requests: string | null
          start_time: string
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
          starting_price?: number | null
          updated_at?: string | null
          wifi?: boolean | null
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
          starting_price?: number | null
          updated_at?: string | null
          wifi?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      category_groups: {
        Row: {
          category_id: string | null
          category_name: string | null
          image_url: string | null
          venue_count: number | null
        }
        Relationships: []
      }
      city_groups: {
        Row: {
          city_id: string | null
          city_name: string | null
          image_url: string | null
          venue_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
