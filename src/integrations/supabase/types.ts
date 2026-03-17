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
      body_scans: {
        Row: {
          activity_level: string
          age: number
          bmi: number
          bmr: number
          body_fat: number
          client_id: string
          created_at: string
          gender: string
          height: number
          hip: number | null
          id: string
          ideal_weight_max: number
          ideal_weight_min: number
          is_manual_edit: boolean
          muscle_mass: number
          neck: number | null
          notes: string | null
          scan_date: string
          tdee: number
          visceral_fat: number | null
          waist: number | null
          water_percentage: number | null
          weight: number
        }
        Insert: {
          activity_level?: string
          age?: number
          bmi?: number
          bmr?: number
          body_fat?: number
          client_id: string
          created_at?: string
          gender?: string
          height?: number
          hip?: number | null
          id?: string
          ideal_weight_max?: number
          ideal_weight_min?: number
          is_manual_edit?: boolean
          muscle_mass?: number
          neck?: number | null
          notes?: string | null
          scan_date?: string
          tdee?: number
          visceral_fat?: number | null
          waist?: number | null
          water_percentage?: number | null
          weight?: number
        }
        Update: {
          activity_level?: string
          age?: number
          bmi?: number
          bmr?: number
          body_fat?: number
          client_id?: string
          created_at?: string
          gender?: string
          height?: number
          hip?: number | null
          id?: string
          ideal_weight_max?: number
          ideal_weight_min?: number
          is_manual_edit?: boolean
          muscle_mass?: number
          neck?: number | null
          notes?: string | null
          scan_date?: string
          tdee?: number
          visceral_fat?: number | null
          waist?: number | null
          water_percentage?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_scans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_entries: {
        Row: {
          id: string
          notes: string | null
          participant_id: string
          submitted_at: string
          value: number
        }
        Insert: {
          id?: string
          notes?: string | null
          participant_id: string
          submitted_at?: string
          value?: number
        }
        Update: {
          id?: string
          notes?: string | null
          participant_id?: string
          submitted_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "challenge_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          badges: string[] | null
          best_value: number
          challenge_id: string
          client_id: string
          current_value: number
          id: string
          joined_at: string
          rank: number | null
        }
        Insert: {
          badges?: string[] | null
          best_value?: number
          challenge_id: string
          client_id: string
          current_value?: number
          id?: string
          joined_at?: string
          rank?: number | null
        }
        Update: {
          badges?: string[] | null
          best_value?: number
          challenge_id?: string
          client_id?: string
          current_value?: number
          id?: string
          joined_at?: string
          rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          created_at: string
          currency: string
          description: string
          end_date: string
          entry_fee: number
          id: string
          image_url: string | null
          kpi_metric: string
          kpi_unit: string
          max_participants: number | null
          prize_description: string | null
          start_date: string
          status: string
          title: string
          trainer_id: string
        }
        Insert: {
          challenge_type?: string
          created_at?: string
          currency?: string
          description?: string
          end_date?: string
          entry_fee?: number
          id?: string
          image_url?: string | null
          kpi_metric?: string
          kpi_unit?: string
          max_participants?: number | null
          prize_description?: string | null
          start_date?: string
          status?: string
          title: string
          trainer_id: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          currency?: string
          description?: string
          end_date?: string
          entry_fee?: number
          id?: string
          image_url?: string | null
          kpi_metric?: string
          kpi_unit?: string
          max_participants?: number | null
          prize_description?: string | null
          start_date?: string
          status?: string
          title?: string
          trainer_id?: string
        }
        Relationships: []
      }
      client_intakes: {
        Row: {
          budget_max: number
          budget_min: number
          city: string
          created_at: string
          email: string | null
          goal: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          training_mode: string
        }
        Insert: {
          budget_max?: number
          budget_min?: number
          city?: string
          created_at?: string
          email?: string | null
          goal?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          training_mode?: string
        }
        Update: {
          budget_max?: number
          budget_min?: number
          city?: string
          created_at?: string
          email?: string | null
          goal?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          training_mode?: string
        }
        Relationships: []
      }
      client_matches: {
        Row: {
          created_at: string
          id: string
          intake_id: string
          match_score: number
          status: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intake_id: string
          match_score?: number
          status?: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intake_id?: string
          match_score?: number
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_matches_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "client_intakes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_moods: {
        Row: {
          client_id: string
          created_at: string
          id: string
          mood: string
          mood_date: string
          note: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          mood: string
          mood_date?: string
          note?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          mood?: string
          mood_date?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_moods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount: number
          billing_cycle: string
          client_id: string
          created_at: string
          currency: string
          id: string
          moyasar_payment_id: string | null
          notes: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          status: string
          trainer_id: string
        }
        Insert: {
          amount?: number
          billing_cycle?: string
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          moyasar_payment_id?: string | null
          notes?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          trainer_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          moyasar_payment_id?: string | null
          notes?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          age: number | null
          auth_user_id: string | null
          billing_cycle: string
          created_at: string
          days_per_week: number | null
          email: string | null
          experience: string | null
          goal: string
          height: number | null
          id: string
          injuries: string | null
          invite_token: string | null
          last_active_at: string | null
          last_workout_date: string
          name: string
          phone: string
          portal_token: string | null
          portal_token_expires_at: string | null
          preferred_equipment: string | null
          privacy_photos: boolean
          privacy_scans: boolean
          privacy_weight: boolean
          program_id: string | null
          subscription_end_date: string
          subscription_price: number
          trainer_id: string | null
          week_number: number
          weight: number | null
        }
        Insert: {
          age?: number | null
          auth_user_id?: string | null
          billing_cycle?: string
          created_at?: string
          days_per_week?: number | null
          email?: string | null
          experience?: string | null
          goal?: string
          height?: number | null
          id?: string
          injuries?: string | null
          invite_token?: string | null
          last_active_at?: string | null
          last_workout_date?: string
          name: string
          phone?: string
          portal_token?: string | null
          portal_token_expires_at?: string | null
          preferred_equipment?: string | null
          privacy_photos?: boolean
          privacy_scans?: boolean
          privacy_weight?: boolean
          program_id?: string | null
          subscription_end_date?: string
          subscription_price?: number
          trainer_id?: string | null
          week_number?: number
          weight?: number | null
        }
        Update: {
          age?: number | null
          auth_user_id?: string | null
          billing_cycle?: string
          created_at?: string
          days_per_week?: number | null
          email?: string | null
          experience?: string | null
          goal?: string
          height?: number | null
          id?: string
          injuries?: string | null
          invite_token?: string | null
          last_active_at?: string | null
          last_workout_date?: string
          name?: string
          phone?: string
          portal_token?: string | null
          portal_token_expires_at?: string | null
          preferred_equipment?: string | null
          privacy_photos?: boolean
          privacy_scans?: boolean
          privacy_weight?: boolean
          program_id?: string | null
          subscription_end_date?: string
          subscription_price?: number
          trainer_id?: string | null
          week_number?: number
          weight?: number | null
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
      copilot_recommendations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          payload: Json
          resolved_at: string | null
          status: string
          summary: string | null
          title: string
          trainer_id: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          payload?: Json
          resolved_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          trainer_id: string
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          payload?: Json
          resolved_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          trainer_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_recommendations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      gulf_foods: {
        Row: {
          added_by_trainer_id: string | null
          calories: number
          carbs: number
          category: string
          created_at: string
          fats: number
          fiber: number
          id: string
          is_verified: boolean
          name_ar: string
          name_en: string
          protein: number
          serving_size: string
        }
        Insert: {
          added_by_trainer_id?: string | null
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fats?: number
          fiber?: number
          id?: string
          is_verified?: boolean
          name_ar: string
          name_en?: string
          protein?: number
          serving_size?: string
        }
        Update: {
          added_by_trainer_id?: string | null
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fats?: number
          fiber?: number
          id?: string
          is_verified?: boolean
          name_ar?: string
          name_en?: string
          protein?: number
          serving_size?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          created_at: string
          currency: string
          description: string
          difficulty: string
          duration_weeks: number
          equipment: string[] | null
          id: string
          language: string
          preview_images: string[] | null
          preview_video_url: string | null
          price: number
          program_id: string | null
          purchase_count: number
          rating_avg: number
          rating_count: number
          status: string
          tags: string[] | null
          title: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string
          difficulty?: string
          duration_weeks?: number
          equipment?: string[] | null
          id?: string
          language?: string
          preview_images?: string[] | null
          preview_video_url?: string | null
          price?: number
          program_id?: string | null
          purchase_count?: number
          rating_avg?: number
          rating_count?: number
          status?: string
          tags?: string[] | null
          title?: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string
          difficulty?: string
          duration_weeks?: number
          equipment?: string[] | null
          id?: string
          language?: string
          preview_images?: string[] | null
          preview_video_url?: string | null
          price?: number
          program_id?: string | null
          purchase_count?: number
          rating_avg?: number
          rating_count?: number
          status?: string
          tags?: string[] | null
          title?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_purchases: {
        Row: {
          amount: number
          buyer_id: string
          commission_rate: number
          created_at: string
          currency: string
          id: string
          listing_id: string
          status: string
          trainer_id: string
        }
        Insert: {
          amount?: number
          buyer_id: string
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          listing_id: string
          status?: string
          trainer_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
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
      meal_logs: {
        Row: {
          client_id: string
          created_at: string
          id: string
          logged_at: string
          meal_item_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          logged_at?: string
          meal_item_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          logged_at?: string
          meal_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_meal_item_id_fkey"
            columns: ["meal_item_id"]
            isOneToOne: false
            referencedRelation: "meal_items"
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
      package_checkout_sessions: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string
          created_at: string
          expires_at: string
          id: string
          package_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          expires_at?: string
          id?: string
          package_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          expires_at?: string
          id?: string
          package_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          account_holder_name: string
          amount: number
          bank_name: string
          iban: string
          id: string
          notes: string | null
          processed_at: string | null
          requested_at: string
          status: string
          trainer_id: string
        }
        Insert: {
          account_holder_name?: string
          amount?: number
          bank_name?: string
          iban?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          trainer_id: string
        }
        Update: {
          account_holder_name?: string
          amount?: number
          bank_name?: string
          iban?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          trainer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          brand_color: string | null
          created_at: string
          full_name: string
          gallery_images: string[] | null
          id: string
          last_payment_id: string | null
          logo_url: string | null
          notify_inactive: boolean | null
          notify_payments: boolean | null
          notify_weekly_report: boolean | null
          onboarding_completed: boolean | null
          page_config: Json | null
          payment_status: string | null
          phone: string | null
          social_links: Json | null
          specialization: string | null
          subscribed_at: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          title: string | null
          user_id: string
          username: string | null
          welcome_message: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string
          full_name?: string
          gallery_images?: string[] | null
          id?: string
          last_payment_id?: string | null
          logo_url?: string | null
          notify_inactive?: boolean | null
          notify_payments?: boolean | null
          notify_weekly_report?: boolean | null
          onboarding_completed?: boolean | null
          page_config?: Json | null
          payment_status?: string | null
          phone?: string | null
          social_links?: Json | null
          specialization?: string | null
          subscribed_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          title?: string | null
          user_id: string
          username?: string | null
          welcome_message?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          brand_color?: string | null
          created_at?: string
          full_name?: string
          gallery_images?: string[] | null
          id?: string
          last_payment_id?: string | null
          logo_url?: string | null
          notify_inactive?: boolean | null
          notify_payments?: boolean | null
          notify_weekly_report?: boolean | null
          onboarding_completed?: boolean | null
          page_config?: Json | null
          payment_status?: string | null
          phone?: string | null
          social_links?: Json | null
          specialization?: string | null
          subscribed_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          title?: string | null
          user_id?: string
          username?: string | null
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
      trainer_discovery_profiles: {
        Row: {
          city: string
          created_at: string
          featured: boolean
          id: string
          is_discoverable: boolean
          price_range_max: number
          price_range_min: number
          specialties: string[] | null
          trainer_id: string
          training_modes: string[] | null
          trial_sessions: boolean
        }
        Insert: {
          city?: string
          created_at?: string
          featured?: boolean
          id?: string
          is_discoverable?: boolean
          price_range_max?: number
          price_range_min?: number
          specialties?: string[] | null
          trainer_id: string
          training_modes?: string[] | null
          trial_sessions?: boolean
        }
        Update: {
          city?: string
          created_at?: string
          featured?: boolean
          id?: string
          is_discoverable?: boolean
          price_range_max?: number
          price_range_min?: number
          specialties?: string[] | null
          trainer_id?: string
          training_modes?: string[] | null
          trial_sessions?: boolean
        }
        Relationships: []
      }
      trainer_notifications: {
        Row: {
          body: string | null
          client_id: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          trainer_id: string
          type: string
        }
        Insert: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          trainer_id: string
          type?: string
        }
        Update: {
          body?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          trainer_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_packages: {
        Row: {
          billing_cycle: string
          created_at: string
          currency: string
          custom_features: string[] | null
          description: string
          id: string
          includes_followup: boolean
          includes_nutrition: boolean
          includes_program: boolean
          is_active: boolean
          name: string
          price: number
          sessions_per_week: number
          trainer_id: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          custom_features?: string[] | null
          description?: string
          id?: string
          includes_followup?: boolean
          includes_nutrition?: boolean
          includes_program?: boolean
          is_active?: boolean
          name?: string
          price?: number
          sessions_per_week?: number
          trainer_id: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          currency?: string
          custom_features?: string[] | null
          description?: string
          id?: string
          includes_followup?: boolean
          includes_nutrition?: boolean
          includes_program?: boolean
          is_active?: boolean
          name?: string
          price?: number
          sessions_per_week?: number
          trainer_id?: string
        }
        Relationships: []
      }
      trainer_payment_settings: {
        Row: {
          account_holder_name: string
          bank_name: string
          created_at: string
          iban: string
          id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          account_holder_name?: string
          bank_name?: string
          created_at?: string
          iban?: string
          id?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          bank_name?: string
          created_at?: string
          iban?: string
          id?: string
          trainer_id?: string
          updated_at?: string
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
      trainer_sessions: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          session_date: string
          session_type: string
          start_time: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          session_date: string
          session_type?: string
          start_time?: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          session_date?: string
          session_type?: string
          start_time?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      create_client_matches: {
        Args: { p_intake_id: string; p_matches: Json }
        Returns: number
      }
      create_package_checkout_session: {
        Args: {
          p_client_email?: string
          p_client_name: string
          p_client_phone: string
          p_package_id: string
        }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      get_client_by_invite_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          id: string
          name: string
          phone: string
          trainer_name: string
        }[]
      }
      get_client_by_portal_token: {
        Args: { p_token: string }
        Returns: {
          age: number | null
          auth_user_id: string | null
          billing_cycle: string
          created_at: string
          days_per_week: number | null
          email: string | null
          experience: string | null
          goal: string
          height: number | null
          id: string
          injuries: string | null
          invite_token: string | null
          last_active_at: string | null
          last_workout_date: string
          name: string
          phone: string
          portal_token: string | null
          portal_token_expires_at: string | null
          preferred_equipment: string | null
          privacy_photos: boolean
          privacy_scans: boolean
          privacy_weight: boolean
          program_id: string | null
          subscription_end_date: string
          subscription_price: number
          trainer_id: string | null
          week_number: number
          weight: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_client_profile: {
        Args: never
        Returns: {
          id: string
          name: string
          portal_token: string
          trainer_id: string
        }[]
      }
      get_portal_body_scans: {
        Args: { p_token: string }
        Returns: {
          activity_level: string
          age: number
          bmi: number
          bmr: number
          body_fat: number
          client_id: string
          created_at: string
          gender: string
          height: number
          hip: number | null
          id: string
          ideal_weight_max: number
          ideal_weight_min: number
          is_manual_edit: boolean
          muscle_mass: number
          neck: number | null
          notes: string | null
          scan_date: string
          tdee: number
          visceral_fat: number | null
          waist: number | null
          water_percentage: number | null
          weight: number
        }[]
        SetofOptions: {
          from: "*"
          to: "body_scans"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_portal_meal_logs: {
        Args: { p_date?: string; p_token: string }
        Returns: {
          meal_item_id: string
        }[]
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
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          brand_color: string
          full_name: string
          gallery_images: string[]
          logo_url: string
          page_config: Json
          social_links: Json
          specialization: string
          title: string
          user_id: string
          username: string
          welcome_message: string
        }[]
      }
      get_trainer_by_username: {
        Args: { p_username: string }
        Returns: {
          avatar_url: string
          bio: string
          brand_color: string
          full_name: string
          gallery_images: string[]
          logo_url: string
          page_config: Json
          social_links: Json
          specialization: string
          title: string
          user_id: string
          username: string
          welcome_message: string
        }[]
      }
      insert_portal_body_scan:
        | {
            Args: {
              p_activity_level: string
              p_age: number
              p_bmi?: number
              p_bmr?: number
              p_body_fat?: number
              p_gender: string
              p_height: number
              p_hip?: number
              p_ideal_weight_max?: number
              p_ideal_weight_min?: number
              p_muscle_mass?: number
              p_neck?: number
              p_notes?: string
              p_tdee?: number
              p_token: string
              p_waist?: number
              p_weight: number
            }
            Returns: string
          }
        | {
            Args: {
              p_activity_level: string
              p_age: number
              p_bmi?: number
              p_bmr?: number
              p_body_fat?: number
              p_gender: string
              p_height: number
              p_hip?: number
              p_ideal_weight_max?: number
              p_ideal_weight_min?: number
              p_muscle_mass?: number
              p_neck?: number
              p_notes?: string
              p_tdee?: number
              p_token: string
              p_visceral_fat?: number
              p_waist?: number
              p_water_percentage?: number
              p_weight: number
            }
            Returns: string
          }
      insert_portal_progress_photo: {
        Args: { p_photo_type: string; p_photo_url: string; p_token: string }
        Returns: string
      }
      link_client_account: {
        Args: { p_auth_user_id: string; p_invite_token: string }
        Returns: string
      }
      log_portal_mood: {
        Args: { p_mood: string; p_note?: string; p_token: string }
        Returns: string
      }
      toggle_portal_meal_log: {
        Args: { p_meal_item_id: string; p_token: string }
        Returns: boolean
      }
      update_portal_activity: { Args: { p_token: string }; Returns: undefined }
      update_portal_privacy: {
        Args: {
          p_privacy_photos: boolean
          p_privacy_scans: boolean
          p_privacy_weight: boolean
          p_token: string
        }
        Returns: boolean
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
