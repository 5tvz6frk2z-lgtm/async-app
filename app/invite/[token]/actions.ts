'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const isDev = process.env.NODE_ENV === 'development'

export async function joinTeamAction(inviteToken: string) {
    if (isDev) console.log('[joinTeamAction] START')

    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            if (isDev) console.log('[joinTeamAction] FAIL - Not authenticated')
            return { success: false, error: 'Not authenticated' }
        }

        // Get invite details
        const { data: invite, error: inviteError } = await supabase
            .from('invitations')
            .select('*, team:teams(name)')
            .eq('token', inviteToken)
            .single()

        if (inviteError || !invite) {
            if (isDev) console.log('[joinTeamAction] FAIL - Invalid invite')
            return { success: false, error: 'Invalid invite' }
        }

        if (invite.status !== 'pending') {
            if (isDev) console.log('[joinTeamAction] FAIL - Invite already used')
            return { success: false, error: 'Invite already used' }
        }

        // Check if invite has expired
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            if (isDev) console.log('[joinTeamAction] FAIL - Invite expired')
            await supabase
                .from('invitations')
                .update({ status: 'expired' })
                .eq('id', invite.id)
            return { success: false, error: 'This invite link has expired. Please request a new one.' }
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', invite.team_id)
            .eq('user_id', user.id)
            .single()

        if (existingMember) {
            if (isDev) console.log('[joinTeamAction] User already a member')
            await supabase
                .from('invitations')
                .update({ status: 'accepted' })
                .eq('id', invite.id)

            return {
                success: true,
                teamId: invite.team_id,
                teamName: invite.team?.name,
                alreadyMember: true
            }
        }

        // Insert team member
        const { error: joinError } = await supabase
            .from('team_members')
            .insert({
                team_id: invite.team_id,
                user_id: user.id,
                role: invite.role || 'member'
            })

        if (joinError) {
            console.error('[joinTeamAction] INSERT FAILED:', joinError.message)
            return { success: false, error: `Failed to join team: ${joinError.message}` }
        }

        if (isDev) console.log('[joinTeamAction] SUCCESS')

        // Update invite status
        await supabase
            .from('invitations')
            .update({ status: 'accepted' })
            .eq('id', invite.id)

        // Revalidate paths
        revalidatePath('/dashboard')
        revalidatePath('/daily')

        return {
            success: true,
            teamId: invite.team_id,
            teamName: invite.team?.name,
            alreadyMember: false
        }

    } catch (error: any) {
        console.error('[joinTeamAction] EXCEPTION:', error.message)
        return { success: false, error: error.message || 'Unknown error' }
    }
}
