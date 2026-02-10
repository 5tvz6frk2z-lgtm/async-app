/**
 * Database Types for Status Loop
 * 
 * Manually generated based on schema in setup_full_db.sql and migration_invitations.sql
 * To regenerate: Run `npx supabase gen types typescript --project-id YOUR_PROJECT_ID`
 */

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
            teams: {
                Row: {
                    id: string
                    name: string
                    billing_email: string | null
                    subscription_status: 'active' | 'trial' | 'past_due'
                    settings: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    billing_email?: string | null
                    subscription_status?: 'active' | 'trial' | 'past_due'
                    settings?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    billing_email?: string | null
                    subscription_status?: 'active' | 'trial' | 'past_due'
                    settings?: Json | null
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    name: string | null
                    email: string | null
                    avatar_url: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    name?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                }
            }
            team_members: {
                Row: {
                    id: string
                    team_id: string
                    user_id: string
                    role: 'manager' | 'member'
                    joined_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    user_id: string
                    role?: 'manager' | 'member'
                    joined_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    user_id?: string
                    role?: 'manager' | 'member'
                    joined_at?: string
                }
            }
            reports: {
                Row: {
                    id: string
                    team_id: string
                    user_id: string
                    date: string
                    sentiment: 'red' | 'yellow' | 'green'
                    blockers: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    user_id: string
                    date?: string
                    sentiment: 'red' | 'yellow' | 'green'
                    blockers?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    user_id?: string
                    date?: string
                    sentiment?: 'red' | 'yellow' | 'green'
                    blockers?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            plan_items: {
                Row: {
                    id: string
                    report_id: string
                    content: string
                    status: 'todo' | 'done' | 'carried_over'
                    type: 'plan_for_tomorrow' | 'actual_done_today'
                }
                Insert: {
                    id?: string
                    report_id: string
                    content: string
                    status?: 'todo' | 'done' | 'carried_over'
                    type: 'plan_for_tomorrow' | 'actual_done_today'
                }
                Update: {
                    id?: string
                    report_id?: string
                    content?: string
                    status?: 'todo' | 'done' | 'carried_over'
                    type?: 'plan_for_tomorrow' | 'actual_done_today'
                }
            }
            invitations: {
                Row: {
                    id: string
                    team_id: string
                    email: string
                    role: 'manager' | 'member'
                    token: string
                    status: 'pending' | 'accepted' | 'expired'
                    created_at: string
                    expires_at: string
                }
                Insert: {
                    id?: string
                    team_id: string
                    email: string
                    role?: 'manager' | 'member'
                    token?: string
                    status?: 'pending' | 'accepted' | 'expired'
                    created_at?: string
                    expires_at?: string
                }
                Update: {
                    id?: string
                    team_id?: string
                    email?: string
                    role?: 'manager' | 'member'
                    token?: string
                    status?: 'pending' | 'accepted' | 'expired'
                    created_at?: string
                    expires_at?: string
                }
            }
        }
        Functions: {
            get_my_team_ids: {
                Args: Record<string, never>
                Returns: string[]
            }
        }
    }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Export individual table types for easy importing
export type Team = Tables<'teams'>
export type Profile = Tables<'profiles'>
export type TeamMember = Tables<'team_members'>
export type Report = Tables<'reports'>
export type PlanItem = Tables<'plan_items'>
export type Invitation = Tables<'invitations'>

// Settings type (JSON column in teams)
export interface TeamSettings {
    weekStart?: string // e.g., "Mon", "Tue", etc.
    enableSmartCarryover?: boolean
    // Add more settings as needed
}
