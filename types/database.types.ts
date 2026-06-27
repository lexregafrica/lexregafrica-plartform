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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          organisation_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organisation_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organisation_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficial_owners: {
        Row: {
          business_address: Json | null
          created_at: string
          date_became_bo: string | null
          date_of_birth: string | null
          email: string | null
          entity_id: string
          full_name: string
          id: string
          id_number: string | null
          id_type: string | null
          kra_pin: string | null
          nationality: string
          nature_of_control: string | null
          occupation: string | null
          organisation_id: string
          phone: string | null
          postal_address: Json | null
          residential_address: Json | null
          share_percentage: number | null
          updated_at: string
        }
        Insert: {
          business_address?: Json | null
          created_at?: string
          date_became_bo?: string | null
          date_of_birth?: string | null
          email?: string | null
          entity_id: string
          full_name: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          kra_pin?: string | null
          nationality?: string
          nature_of_control?: string | null
          occupation?: string | null
          organisation_id: string
          phone?: string | null
          postal_address?: Json | null
          residential_address?: Json | null
          share_percentage?: number | null
          updated_at?: string
        }
        Update: {
          business_address?: Json | null
          created_at?: string
          date_became_bo?: string | null
          date_of_birth?: string | null
          email?: string | null
          entity_id?: string
          full_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          kra_pin?: string | null
          nationality?: string
          nature_of_control?: string | null
          occupation?: string | null
          organisation_id?: string
          phone?: string | null
          postal_address?: Json | null
          residential_address?: Json | null
          share_percentage?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficial_owners_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficial_owners_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_forms: {
        Row: {
          created_at: string
          entity_id: string
          file_url: string | null
          form_type: string
          generated_at: string | null
          id: string
          metadata: Json | null
          organisation_id: string
          signed_at: string | null
          status: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          file_url?: string | null
          form_type: string
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          organisation_id: string
          signed_at?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          file_url?: string | null
          form_type?: string
          generated_at?: string | null
          id?: string
          metadata?: Json | null
          organisation_id?: string
          signed_at?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_forms_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_forms_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_events: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string
          entity_id: string
          id: string
          notes: string | null
          organisation_id: string
          status: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          entity_id: string
          id?: string
          notes?: string | null
          organisation_id: string
          status?: Database["public"]["Enums"]["compliance_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          entity_id?: string
          id?: string
          notes?: string | null
          organisation_id?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      directors: {
        Row: {
          appointment_date: string | null
          created_at: string
          email: string | null
          entity_id: string
          full_name: string
          id: string
          id_number: string
          id_type: string
          is_beneficial_owner: boolean | null
          is_foreign: boolean
          is_shareholder: boolean | null
          kra_pin: string | null
          nationality: string
          organisation_id: string
          passport_photo_url: string | null
          phone: string | null
          residential_address: Json | null
          updated_at: string
        }
        Insert: {
          appointment_date?: string | null
          created_at?: string
          email?: string | null
          entity_id: string
          full_name: string
          id?: string
          id_number: string
          id_type?: string
          is_beneficial_owner?: boolean | null
          is_foreign?: boolean
          is_shareholder?: boolean | null
          kra_pin?: string | null
          nationality?: string
          organisation_id: string
          passport_photo_url?: string | null
          phone?: string | null
          residential_address?: Json | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string | null
          created_at?: string
          email?: string | null
          entity_id?: string
          full_name?: string
          id?: string
          id_number?: string
          id_type?: string
          is_beneficial_owner?: boolean | null
          is_foreign?: boolean
          is_shareholder?: boolean | null
          kra_pin?: string | null
          nationality?: string
          organisation_id?: string
          passport_photo_url?: string | null
          phone?: string | null
          residential_address?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directors_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directors_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"] | null
          created_at: string
          deleted_at: string | null
          document_type: string | null
          entity_id: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          ocr_data: Json | null
          ocr_status: string | null
          organisation_id: string
          tags: Json | null
          updated_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["document_category"] | null
          created_at?: string
          deleted_at?: string | null
          document_type?: string | null
          entity_id?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          ocr_data?: Json | null
          ocr_status?: string | null
          organisation_id: string
          tags?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"] | null
          created_at?: string
          deleted_at?: string | null
          document_type?: string | null
          entity_id?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          ocr_data?: Json | null
          ocr_status?: string | null
          organisation_id?: string
          tags?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          applicant_email: string | null
          applicant_mobile: string | null
          applicant_name: string | null
          applicant_relationship:
            | Database["public"]["Enums"]["applicant_relationship"]
            | null
          articles_url: string | null
          created_at: string
          date_incorporated: string | null
          deleted_at: string | null
          email: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          has_custom_articles: boolean | null
          id: string
          kra_pin: string | null
          legal_name: string | null
          nature_of_business: string | null
          nominal_capital: number | null
          onboarding_data: Json | null
          onboarding_path: Database["public"]["Enums"]["onboarding_path"]
          onboarding_step: number
          organisation_id: string
          phone: string | null
          postal_address: Json | null
          proposed_names: Json | null
          registered_address: Json | null
          registration_number: string | null
          registration_status: string | null
          share_class: string | null
          status: Database["public"]["Enums"]["entity_status"]
          total_shares: number | null
          trading_name: string | null
          updated_at: string
        }
        Insert: {
          applicant_email?: string | null
          applicant_mobile?: string | null
          applicant_name?: string | null
          applicant_relationship?:
            | Database["public"]["Enums"]["applicant_relationship"]
            | null
          articles_url?: string | null
          created_at?: string
          date_incorporated?: string | null
          deleted_at?: string | null
          email?: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          has_custom_articles?: boolean | null
          id?: string
          kra_pin?: string | null
          legal_name?: string | null
          nature_of_business?: string | null
          nominal_capital?: number | null
          onboarding_data?: Json | null
          onboarding_path: Database["public"]["Enums"]["onboarding_path"]
          onboarding_step?: number
          organisation_id: string
          phone?: string | null
          postal_address?: Json | null
          proposed_names?: Json | null
          registered_address?: Json | null
          registration_number?: string | null
          registration_status?: string | null
          share_class?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          total_shares?: number | null
          trading_name?: string | null
          updated_at?: string
        }
        Update: {
          applicant_email?: string | null
          applicant_mobile?: string | null
          applicant_name?: string | null
          applicant_relationship?:
            | Database["public"]["Enums"]["applicant_relationship"]
            | null
          articles_url?: string | null
          created_at?: string
          date_incorporated?: string | null
          deleted_at?: string | null
          email?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          has_custom_articles?: boolean | null
          id?: string
          kra_pin?: string | null
          legal_name?: string | null
          nature_of_business?: string | null
          nominal_capital?: number | null
          onboarding_data?: Json | null
          onboarding_path?: Database["public"]["Enums"]["onboarding_path"]
          onboarding_step?: number
          organisation_id?: string
          phone?: string | null
          postal_address?: Json | null
          proposed_names?: Json | null
          registered_address?: Json | null
          registration_number?: string | null
          registration_status?: string | null
          share_class?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          total_shares?: number | null
          trading_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entities_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      lawyer_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          entity_id: string
          id: string
          lawyer_user_id: string
          notes: string | null
          service_type: string
          status: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          entity_id: string
          id?: string
          lawyer_user_id: string
          notes?: string | null
          service_type: string
          status?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          entity_id?: string
          id?: string
          lawyer_user_id?: string
          notes?: string | null
          service_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lawyer_assignments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          organisation_id: string | null
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          organisation_id?: string | null
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          organisation_id?: string | null
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          created_at: string
          data: Json
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          onboarding_path: Database["public"]["Enums"]["onboarding_path"]
          organisation_id: string | null
          step: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          onboarding_path: Database["public"]["Enums"]["onboarding_path"]
          organisation_id?: string | null
          step?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          onboarding_path?: Database["public"]["Enums"]["onboarding_path"]
          organisation_id?: string | null
          step?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          organisation_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organisation_id: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          organisation_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shareholders: {
        Row: {
          address: Json | null
          corporate_details: Json | null
          created_at: string
          email: string | null
          entity_id: string
          id: string
          id_or_reg_number: string | null
          is_corporate: boolean
          kra_pin: string | null
          legal_name: string
          organisation_id: string
          phone: string | null
          share_percentage: number | null
          shareholder_type: Database["public"]["Enums"]["shareholder_type"]
          shares_held: number
          updated_at: string
        }
        Insert: {
          address?: Json | null
          corporate_details?: Json | null
          created_at?: string
          email?: string | null
          entity_id: string
          id?: string
          id_or_reg_number?: string | null
          is_corporate?: boolean
          kra_pin?: string | null
          legal_name: string
          organisation_id: string
          phone?: string | null
          share_percentage?: number | null
          shareholder_type?: Database["public"]["Enums"]["shareholder_type"]
          shares_held?: number
          updated_at?: string
        }
        Update: {
          address?: Json | null
          corporate_details?: Json | null
          created_at?: string
          email?: string | null
          entity_id?: string
          id?: string
          id_or_reg_number?: string | null
          is_corporate?: boolean
          kra_pin?: string | null
          legal_name?: string
          organisation_id?: string
          phone?: string | null
          share_percentage?: number | null
          shareholder_type?: Database["public"]["Enums"]["shareholder_type"]
          shares_held?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareholders_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shareholders_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { org_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      applicant_relationship:
        | "promoter"
        | "director"
        | "shareholder"
        | "advocate"
        | "authorised_agent"
      compliance_status: "pending" | "complete" | "overdue"
      document_category:
        | "legal"
        | "governance"
        | "financial"
        | "compliance"
        | "operational"
        | "other"
      entity_status:
        | "draft"
        | "pending_registration"
        | "active"
        | "suspended"
        | "dissolved"
      entity_type:
        | "limited_company"
        | "public_limited_company"
        | "limited_liability_partnership"
        | "sole_proprietorship"
        | "partnership"
        | "company_limited_by_guarantee"
        | "foreign_branch"
        | "cooperative"
      onboarding_path: "existing_entity" | "new_entity" | "informal_business"
      shareholder_type: "individual" | "company"
      user_role: "super_admin" | "business_owner" | "lawyer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      applicant_relationship: [
        "promoter",
        "director",
        "shareholder",
        "advocate",
        "authorised_agent",
      ],
      compliance_status: ["pending", "complete", "overdue"],
      document_category: [
        "legal",
        "governance",
        "financial",
        "compliance",
        "operational",
        "other",
      ],
      entity_status: [
        "draft",
        "pending_registration",
        "active",
        "suspended",
        "dissolved",
      ],
      entity_type: [
        "limited_company",
        "public_limited_company",
        "limited_liability_partnership",
        "sole_proprietorship",
        "partnership",
        "company_limited_by_guarantee",
        "foreign_branch",
        "cooperative",
      ],
      onboarding_path: ["existing_entity", "new_entity", "informal_business"],
      shareholder_type: ["individual", "company"],
      user_role: ["super_admin", "business_owner", "lawyer"],
    },
  },
} as const
