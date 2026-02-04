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
            profiles: {
                Row: {
                    id: string
                    role: 'manager' | 'member'
                    name: string | null
                    team_id: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    role?: 'manager' | 'member'
                    name?: string | null
                    team_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    role?: 'manager' | 'member'
                    name?: string | null
                    team_id?: string | null
                    created_at?: string
                }
            }
            reports: {
                Row: {
                    id: string
                    user_id: string
                    date: string
                    sentiment: 'red' | 'yellow' | 'green'
                    blockers: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    date?: string
                    sentiment: 'red' | 'yellow' | 'green'
                    blockers?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
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
        }
    }
}
