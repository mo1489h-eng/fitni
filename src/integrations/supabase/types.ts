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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string
          goal: string
          id: string
          last_workout_date: string
          name: string
          phone: string
          portal_token: string | null
          program_id: string | null
          subscription_end_date: string
          subscription_price: number
          trainer_id: string | null
          week_number: number
        }
        Insert: {
          created_at?: string
          goal?: string
          id?: string
          last_workout_date?: string
          name: string
          phone?: string
          portal_token?: string | null
          program_id?: string | null
          subscription_end_date?: string
          subscription_price?: number
          trainer_id?: string | null
          week_number?: number
        }
        Update: {
          created_at?: string
          goal?: string
          id?: string
          last_workout_date?: string
          name?: string
          phone?: string
          portal_token?: string | null
          program_id?: string | null
          subscription_end_date?: string
          subscription_price?: number
          trainer_id?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "clients_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_items: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fats: number
          food_name: string
          id: string
          item_order: number
          meal_name: string
          meal_plan_id: string
          protein: number
          quantity: string | null
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          fats?: number
          food_name: string
          id?: string
          item_order?: number
          meal_name?: string
          meal_plan_id: string
          protein?: number
          quantity?: string | null
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fats?: number
          food_name?: string
          id?: string
          item_order?: number
          meal_name?: string
          meal_plan_id?: string
          protein?: number
          quantity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          trainer_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          trainer_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          client_id: string
          created_at: string
          fat_percentage: number
          id: string
          recorded_at: string
          weight: number
        }
        Insert: {
          client_id: string
          created_at?: string
          fat_percentage?: number
          id?: string
          recorded_at?: string
          weight?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          fat_percentage?: number
          id?: string
          recorded_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          brand_color: string | null
          created_at: string
          full_name: string
          id: string
          logo_url: string | null
          notify_inactive: boolean | null
          notify_payments: boolean | null
          notify_weekly_report: boolean | null
          phone: string | null
          specialization: string | null
          subscribed_at: string | null
          subscription_plan: string | null
          user_id: string
          welcome_message: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string
          full_name?: string
          id?: string
          logo_url?: string | null
          notify_inactive?: boolean | null
          notify_payments?: boolean | null
          notify_weekly_report?: boolean | null
          phone?: string | null
          specialization?: string | null
          subscribed_at?: string | null
          subscription_plan?: string | null
          user_id: string
          welcome_message?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string
          full_name?: string
          id?: string
          logo_url?: string | null
          notify_inactive?: boolean | null
          notify_payments?: boolean | null
          notify_weekly_report?: boolean | null
          phone?: string | null
          specialization?: string | null
          subscribed_at?: string | null
          subscription_plan?: string | null
          user_id?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      program_days: {
        Row: {
          created_at: string
          day_name: string
          day_order: number
          id: string
          program_id: string
        }
        Insert: {
          created_at?: string
          day_name: string
          day_order?: number
          id?: string
          program_id: string
        }
        Update: {
          created_at?: string
          day_name?: string
          day_order?: number
          id?: string
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          created_at: string
          day_id: string
          exercise_order: number
          id: string
          name: string
          reps: number
          sets: number
          video_url: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          day_id: string
          exercise_order?: number
          id?: string
          name: string
          reps?: number
          sets?: number
          video_url?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          day_id?: string
          exercise_order?: number
          id?: string
          name?: string
          reps?: number
          sets?: number
          video_url?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string
          id: string
          name: string
          trainer_id: string
          weeks: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          trainer_id: string
          weeks?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          trainer_id?: string
          weeks?: number
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          client_id: string
          created_at: string
          id: string
          photo_type: string
          photo_url: string
          trainer_id: string | null
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          photo_type: string
          photo_url: string
          trainer_id?: string | null
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          photo_type?: string
          photo_url?: string
          trainer_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          assigned_to_email: string | null
          code: string
          created_at: string
          duration_days: number
          id: string
          is_active: boolean
          max_uses: number
          used_at: string | null
          used_by_trainer_id: string | null
          used_count: number
        }
        Insert: {
          assigned_to_email?: string | null
          code: string
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_uses?: number
          used_at?: string | null
          used_by_trainer_id?: string | null
          used_count?: number
        }
        Update: {
          assigned_to_email?: string | null
          code?: string
          created_at?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          max_uses?: number
          used_at?: string | null
          used_by_trainer_id?: string | null
          used_count?: number
        }
        Relationships: []
      }
      trainer_posts: {
        Row: {
          audience: string
          audience_client_ids: string[] | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          post_type: string
          trainer_id: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          audience?: string
          audience_client_ids?: string[] | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          post_type?: string
          trainer_id: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          audience?: string
          audience_client_ids?: string[] | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          post_type?: string
          trainer_id?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          brand_color: string | null
          full_name: string | null
          logo_url: string | null
          specialization: string | null
          user_id: string | null
          welcome_message: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          full_name?: string | null
          logo_url?: string | null
          specialization?: string | null
          user_id?: string | null
          welcome_message?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          full_name?: string | null
          logo_url?: string | null
          specialization?: string | null
          user_id?: string | null
          welcome_message?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_client_by_portal_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          goal: string
          id: string
          last_workout_date: string
          name: string
          phone: string
          portal_token: string | null
          program_id: string | null
          subscription_end_date: string
          subscription_price: number
          trainer_id: string | null
          week_number: number
        }[]
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_portal_meal_plans: { Args: { p_token: string }; Returns: Json }
      get_portal_progress_photos: {
        Args: { p_token: string }
        Returns: {
          client_id: string
          created_at: string
          id: string
          photo_type: string
          photo_url: string
          trainer_id: string | null
          uploaded_by: string
        }[]
        SetofOptions: {
          from: "*"
          to: "progress_photos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      insert_portal_progress_photo: {
        Args: { p_photo_type: string; p_photo_url: string; p_token: string }
        Returns: string
      }
      validate_and_redeem_promo: {
        Args: { p_code: string; p_email: string; p_trainer_id: string }
        Returns: Json
      }
      validate_promo_code: {
        Args: { p_code: string; p_email: string }
        Returns: Json
      }
      verify_portal_access: {
        Args: { p_client_id: string; p_token: string }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
