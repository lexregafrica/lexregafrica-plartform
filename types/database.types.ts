// Auto-generate with: npx supabase gen types typescript --linked > types/database.types.ts
// This is a placeholder until the Supabase project is linked.

export type Database = {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['organisations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organisations']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      organisation_members: {
        Row: {
          id: string
          organisation_id: string
          user_id: string
          role: 'super_admin' | 'business_owner' | 'lawyer'
          invited_by: string | null
          joined_at: string
        }
        Insert: Omit<Database['public']['Tables']['organisation_members']['Row'], 'id' | 'joined_at'>
        Update: Partial<Database['public']['Tables']['organisation_members']['Insert']>
      }
      entities: {
        Row: {
          id: string
          organisation_id: string
          entity_type: 'limited_company' | 'public_limited_company' | 'limited_liability_partnership' | 'sole_proprietorship' | 'partnership' | 'company_limited_by_guarantee' | 'foreign_branch' | 'cooperative'
          status: 'draft' | 'pending_registration' | 'active' | 'suspended' | 'dissolved'
          onboarding_path: 'existing_entity' | 'new_entity' | 'informal_business'
          legal_name: string | null
          trading_name: string | null
          registration_number: string | null
          kra_pin: string | null
          date_incorporated: string | null
          registered_address: Record<string, string> | null
          phone: string | null
          email: string | null
          onboarding_step: number
          onboarding_data: Record<string, unknown>
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['entities']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['entities']['Insert']>
      }
      lawyer_assignments: {
        Row: {
          id: string
          entity_id: string
          lawyer_user_id: string
          assigned_by: string
          service_type: string
          status: string
          notes: string | null
          assigned_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['lawyer_assignments']['Row'], 'id' | 'assigned_at'>
        Update: Partial<Database['public']['Tables']['lawyer_assignments']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          organisation_id: string | null
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          metadata: Record<string, unknown>
          ip_address: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Enums: {
      user_role: 'super_admin' | 'business_owner' | 'lawyer'
      entity_type: 'limited_company' | 'public_limited_company' | 'limited_liability_partnership' | 'sole_proprietorship' | 'partnership' | 'company_limited_by_guarantee' | 'foreign_branch' | 'cooperative'
      entity_status: 'draft' | 'pending_registration' | 'active' | 'suspended' | 'dissolved'
      onboarding_path: 'existing_entity' | 'new_entity' | 'informal_business'
    }
  }
}
