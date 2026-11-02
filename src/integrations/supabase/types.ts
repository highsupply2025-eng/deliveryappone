export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      courier_shifts: {
        Row: {
          adjacent_confirmed: boolean
          break_ends_at: string | null
          break_request_used: boolean
          break_started_at: string | null
          break_status: string
          courier_id: string
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          neighborhoods: string[]
          rejected_order_id: string | null
          salary_day_eligible: boolean
          scheduled_start: string
          started_at: string | null
          status: string
          worked_seconds: number
        }
        Insert: {
          adjacent_confirmed?: boolean
          break_ends_at?: string | null
          break_request_used?: boolean
          break_started_at?: string | null
          break_status?: string
          courier_id: string
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          neighborhoods: string[]
          rejected_order_id?: string | null
          salary_day_eligible?: boolean
          scheduled_start: string
          started_at?: string | null
          status?: string
          worked_seconds?: number
        }
        Update: {
          adjacent_confirmed?: boolean
          break_ends_at?: string | null
          break_request_used?: boolean
          break_started_at?: string | null
          break_status?: string
          courier_id?: string
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          neighborhoods?: string[]
          rejected_order_id?: string | null
          salary_day_eligible?: boolean
          scheduled_start?: string
          started_at?: string | null
          status?: string
          worked_seconds?: number
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          created_at: string
          data: Json
          id: string
          reviewed_at: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          reviewed_at?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          reviewed_at?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_ar: string
          category_en: string
          created_at: string
          description_ar: string
          description_en: string
          id: string
          image_url: string | null
          is_available: boolean
          name_ar: string
          name_en: string
          price: number
          restaurant_id: string
        }
        Insert: {
          category_ar?: string
          category_en?: string
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name_ar: string
          name_en: string
          price: number
          restaurant_id: string
        }
        Update: {
          category_ar?: string
          category_en?: string
          created_at?: string
          description_ar?: string
          description_en?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          name_ar?: string
          name_en?: string
          price?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string | null
          name_ar: string
          name_en: string
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          id?: string
          menu_item_id?: string | null
          name_ar: string
          name_en: string
          order_id: string
          price: number
          quantity?: number
        }
        Update: {
          id?: string
          menu_item_id?: string | null
          name_ar?: string
          name_en?: string
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_live_locations: {
        Row: {
          accuracy: number | null
          courier_id: string
          heading: number | null
          latitude: number
          longitude: number
          order_id: string
          speed: number | null
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          courier_id: string
          heading?: number | null
          latitude: number
          longitude: number
          order_id: string
          speed?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          courier_id?: string
          heading?: number | null
          latitude?: number
          longitude?: number
          order_id?: string
          speed?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_live_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          courier_accepted_at: string | null
          courier_id: string | null
          created_at: string
          customer_id: string
          delivery_code_attempts: number
          delivery_fee: number
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_neighborhood: string | null
          id: string
          notes: string | null
          phone: string
          pickup_address: string | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address: string
          courier_accepted_at?: string | null
          courier_id?: string | null
          created_at?: string
          customer_id: string
          delivery_code_attempts?: number
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_neighborhood?: string | null
          id?: string
          notes?: string | null
          phone: string
          pickup_address?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string
          courier_accepted_at?: string | null
          courier_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_code_attempts?: number
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_neighborhood?: string | null
          id?: string
          notes?: string | null
          phone?: string
          pickup_address?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          delivery_code: string | null
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          delivery_code?: string | null
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          delivery_code?: string | null
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      restaurant_payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          requested_by: string
          restaurant_id: string
          reviewed_at: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          requested_by: string
          restaurant_id: string
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          requested_by?: string
          restaurant_id?: string
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payout_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          created_at: string
          cuisine_ar: string
          cuisine_en: string
          delivery_fee: number
          eta_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          min_order: number
          name_ar: string
          name_en: string
          owner_id: string | null
          rating: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          cuisine_ar?: string
          cuisine_en?: string
          delivery_fee?: number
          eta_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          min_order?: number
          name_ar: string
          name_en: string
          owner_id?: string | null
          rating?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          cuisine_ar?: string
          cuisine_en?: string
          delivery_fee?: number
          eta_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          min_order?: number
          name_ar?: string
          name_en?: string
          owner_id?: string | null
          rating?: number
        }
        Relationships: []
      }
      staff_applications: {
        Row: {
          business_name: string | null
          created_at: string
          documents: Json
          full_name: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          type: string
          user_id: string
          vehicle: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          documents?: Json
          full_name: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          type: string
          user_id: string
          vehicle?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          documents?: Json
          full_name?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          type?: string
          user_id?: string
          vehicle?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      courier_shift_availability: {
        Row: {
          available: boolean | null
          courier_id: string | null
          id: string | null
          work_complete: boolean | null
        }
        Insert: {
          available?: never
          courier_id?: string | null
          id?: string | null
          work_complete?: never
        }
        Update: {
          available?: never
          courier_id?: string | null
          id?: string | null
          work_complete?: never
        }
        Relationships: []
      }
    }
    Functions: {
      complete_due_courier_shifts: { Args: never; Returns: undefined }
      courier_deliver_order: {
        Args: { p_code: string; p_order_id: string }
        Returns: Json
      }
      courier_shift_action: {
        Args: { p_action: string; p_order_id?: string; p_shift_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      norm_area: { Args: { t: string }; Returns: string }
      pick_courier_for_order: {
        Args: { p_neighborhood: string; p_order_id: string }
        Returns: string
      }
      publish_courier_location: {
        Args: {
          p_accuracy?: number
          p_heading?: number
          p_latitude: number
          p_longitude: number
          p_order_id: string
          p_speed?: number
        }
        Returns: undefined
      }
      request_restaurant_payout: {
        Args: { p_restaurant_id: string }
        Returns: number
      }
      review_courier_break: {
        Args: { p_approve: boolean; p_shift_id: string }
        Returns: undefined
      }
      review_staff_application: {
        Args: { p_approve: boolean; p_id: string; p_reason?: string }
        Returns: undefined
      }
      shift_work_seconds: {
        Args: {
          at_time?: string
          s: Database["public"]["Tables"]["courier_shifts"]["Row"]
        }
        Returns: number
      }
      submit_staff_application: {
        Args: {
          p_business_name: string
          p_documents: Json
          p_full_name: string
          p_type: string
          p_vehicle: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "restaurant" | "courier" | "customer"
      order_status:
        | "pending"
        | "accepted"
        | "preparing"
        | "ready"
        | "on_the_way"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "restaurant", "courier", "customer"],
      order_status: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "on_the_way",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
