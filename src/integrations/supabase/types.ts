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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audio_files: {
        Row: {
          created_at: string | null
          field_name: string
          id: string
          report_id: string | null
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: string
          report_id?: string | null
          storage_path: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: string
          report_id?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_files_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "error_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      deputy_assignments: {
        Row: {
          assigned_at: string | null
          deputy_id: string | null
          id: string
          is_active: boolean | null
          team_leader_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          deputy_id?: string | null
          id?: string
          is_active?: boolean | null
          team_leader_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          deputy_id?: string | null
          id?: string
          is_active?: boolean | null
          team_leader_id?: string | null
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          additional_info: string | null
          afo_number: string
          approval_status: string | null
          approved_at: string | null
          approved_by_id: string | null
          assigned_team_leader_id: string | null
          corrective_action: string
          created_at: string | null
          creator_id: string
          creator_name: string
          defective_quantity: number
          department_id: string | null
          detection_location: string | null
          error_cause: string
          id: string
          machine_id: string | null
          order_number: string
          personal_number: string | null
          problem_description: string
          quantity_type: string | null
          rejected_at: string | null
          rejected_by_id: string | null
          rejection_reason: string | null
          total_defective_quantity: number
          updated_at: string | null
        }
        Insert: {
          additional_info?: string | null
          afo_number: string
          approval_status?: string | null
          approved_at?: string | null
          approved_by_id?: string | null
          assigned_team_leader_id?: string | null
          corrective_action: string
          created_at?: string | null
          creator_id: string
          creator_name: string
          defective_quantity: number
          department_id?: string | null
          detection_location?: string | null
          error_cause: string
          id: string
          machine_id?: string | null
          order_number: string
          personal_number?: string | null
          problem_description: string
          quantity_type?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          total_defective_quantity: number
          updated_at?: string | null
        }
        Update: {
          additional_info?: string | null
          afo_number?: string
          approval_status?: string | null
          approved_at?: string | null
          approved_by_id?: string | null
          assigned_team_leader_id?: string | null
          corrective_action?: string
          created_at?: string | null
          creator_id?: string
          creator_name?: string
          defective_quantity?: number
          department_id?: string | null
          detection_location?: string | null
          error_cause?: string
          id?: string
          machine_id?: string | null
          order_number?: string
          personal_number?: string | null
          problem_description?: string
          quantity_type?: string | null
          rejected_at?: string | null
          rejected_by_id?: string | null
          rejection_reason?: string | null
          total_defective_quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_reports_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      excel_data: {
        Row: {
          created_at: string | null
          id: string
          row_data: Json
          row_index: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          row_data: Json
          row_index?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          row_data?: Json
          row_index?: number | null
        }
        Relationships: []
      }
      excel_settings: {
        Row: {
          additional_columns: Json | null
          afo_number_column: string | null
          article_description_column: string | null
          article_number_column: string | null
          department_column: string | null
          file_name: string | null
          id: string
          order_number_column: string | null
          row_count: number | null
          updated_at: string | null
        }
        Insert: {
          additional_columns?: Json | null
          afo_number_column?: string | null
          article_description_column?: string | null
          article_number_column?: string | null
          department_column?: string | null
          file_name?: string | null
          id?: string
          order_number_column?: string | null
          row_count?: number | null
          updated_at?: string | null
        }
        Update: {
          additional_columns?: Json | null
          afo_number_column?: string | null
          article_description_column?: string | null
          article_number_column?: string | null
          department_column?: string | null
          file_name?: string | null
          id?: string
          order_number_column?: string | null
          row_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      machines: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      n8n_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          name: string
          personal_number: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id: string
          name: string
          personal_number?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          name?: string
          personal_number?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_department: { Args: { _user_id: string }; Returns: string }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { target_role: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teamleader" | "employee"
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
    Enums: {
      app_role: ["admin", "teamleader", "employee"],
    },
  },
} as const
