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
      compliance_logs: {
        Row: {
          id: string
          user_id: string
          protocol_id: string
          activity_type: string
          activity_index: number
          activity_name: string
          scheduled_date: string
          scheduled_time: string | null
          completed_at: string
          skipped: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          protocol_id: string
          activity_type: string
          activity_index: number
          activity_name: string
          scheduled_date: string
          scheduled_time?: string | null
          completed_at?: string
          skipped?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          protocol_id?: string
          activity_type?: string
          activity_index?: number
          activity_name?: string
          scheduled_date?: string
          scheduled_time?: string | null
          completed_at?: string
          skipped?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_logs_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      criticisms: {
        Row: {
          category: string
          created_at: string | null
          criticism: string
          id: string
          iteration_added: number
          protocol_id: string | null
          resolution_history: Json | null
          resolution_score: number | null
          severity: string
          suggestion: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          criticism: string
          id?: string
          iteration_added: number
          protocol_id?: string | null
          resolution_history?: Json | null
          resolution_score?: number | null
          severity: string
          suggestion: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          criticism?: string
          id?: string
          iteration_added?: number
          protocol_id?: string | null
          resolution_history?: Json | null
          resolution_score?: number | null
          severity?: string
          suggestion?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criticisms_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      protocol_modifications: {
        Row: {
          created_at: string | null
          current_scores: Json | null
          id: string
          proposed_protocol_data: Json | null
          proposed_scores: Json | null
          protocol_id: string | null
          reasoning: string | null
          status: string | null
          user_id: string | null
          user_message: string
        }
        Insert: {
          created_at?: string | null
          current_scores?: Json | null
          id?: string
          proposed_protocol_data?: Json | null
          proposed_scores?: Json | null
          protocol_id?: string | null
          reasoning?: string | null
          status?: string | null
          user_id?: string | null
          user_message: string
        }
        Update: {
          created_at?: string | null
          current_scores?: Json | null
          id?: string
          proposed_protocol_data?: Json | null
          proposed_scores?: Json | null
          protocol_id?: string | null
          reasoning?: string | null
          status?: string | null
          user_id?: string | null
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_modifications_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_questions: {
        Row: {
          answer: string
          citations: Json | null
          conversation_id: string
          created_at: string | null
          id: string
          protocol_id: string | null
          question: string
          user_id: string | null
          version_chain_id: string
        }
        Insert: {
          answer: string
          citations?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          protocol_id?: string | null
          question: string
          user_id?: string | null
          version_chain_id: string
        }
        Update: {
          answer?: string
          citations?: Json | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          protocol_id?: string | null
          question?: string
          user_id?: string | null
          version_chain_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_questions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          change_note: string | null
          change_source: string | null
          citations: Json | null
          config_id: string | null
          created_at: string | null
          critiques: Json | null
          expires_at: string | null
          goal_scores: Json | null
          id: string
          is_anonymous: boolean | null
          is_current: boolean | null
          iteration: number | null
          name: string | null
          parent_version_id: string | null
          protocol_data: Json
          requirement_scores: Json | null
          requirements_met: boolean | null
          user_id: string | null
          verified: boolean | null
          verified_at: string | null
          version: number | null
          version_chain_id: string | null
          viability_score: number | null
          weighted_goal_score: number | null
        }
        Insert: {
          change_note?: string | null
          change_source?: string | null
          citations?: Json | null
          config_id?: string | null
          created_at?: string | null
          critiques?: Json | null
          expires_at?: string | null
          goal_scores?: Json | null
          id?: string
          is_anonymous?: boolean | null
          is_current?: boolean | null
          iteration?: number | null
          name?: string | null
          parent_version_id?: string | null
          protocol_data: Json
          requirement_scores?: Json | null
          requirements_met?: boolean | null
          user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          version?: number | null
          version_chain_id?: string | null
          viability_score?: number | null
          weighted_goal_score?: number | null
        }
        Update: {
          change_note?: string | null
          change_source?: string | null
          citations?: Json | null
          config_id?: string | null
          created_at?: string | null
          critiques?: Json | null
          expires_at?: string | null
          goal_scores?: Json | null
          id?: string
          is_anonymous?: boolean | null
          is_current?: boolean | null
          iteration?: number | null
          name?: string | null
          parent_version_id?: string | null
          protocol_data?: Json
          requirement_scores?: Json | null
          requirements_met?: boolean | null
          user_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
          version?: number | null
          version_chain_id?: string | null
          viability_score?: number | null
          weighted_goal_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "protocols_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "user_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      research_findings: {
        Row: {
          confidence: string
          created_at: string | null
          finding: string
          id: string
          sources: Json | null
          topic: string
          use_count: number | null
          user_id: string | null
        }
        Insert: {
          confidence: string
          created_at?: string | null
          finding: string
          id?: string
          sources?: Json | null
          topic: string
          use_count?: number | null
          user_id?: string | null
        }
        Update: {
          confidence?: string
          created_at?: string | null
          finding?: string
          id?: string
          sources?: Json | null
          topic?: string
          use_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_configs: {
        Row: {
          created_at: string | null
          goals: Json
          id: string
          is_default: boolean | null
          personal_info: Json
          requirements: string[]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          goals?: Json
          id?: string
          is_default?: boolean | null
          personal_info: Json
          requirements?: string[]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          goals?: Json
          id?: string
          is_default?: boolean | null
          personal_info?: Json
          requirements?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      user_notes: {
        Row: {
          created_at: string | null
          id: string
          note: string
          protocol_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note: string
          protocol_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string
          protocol_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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
