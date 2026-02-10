export interface Team {
    id: string
    name: string
    billing_email?: string
    subscription_status: 'active' | 'trial' | 'past_due'
    created_at: string
}

export interface Profile {
    id: string
    name: string | null
    email: string | null
    avatar_url?: string | null
    created_at: string
}

export interface TeamMember {
    id: string
    team_id: string
    user_id: string
    role: 'manager' | 'member'
    joined_at: string
    team?: Team // Joined data
    profile?: Profile // Joined data
}

export type Role = 'manager' | 'member'
