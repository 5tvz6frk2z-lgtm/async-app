"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface TeamSettings {
    teamName: string
    reminderTime: string
    workDays: string[]
    enablePulse: boolean
    enableSmartCarryover: boolean
    weeklyReport: {
        enabled: boolean
        day: string // "Mon" | "Tue" ...
        time: string // "18:00"
    }
    morningBriefing: {
        enabled: boolean
        time: string // "07:00"
    }
}

const DEFAULT_SETTINGS: TeamSettings = {
    teamName: "My Engineering Team",
    reminderTime: "09:00",
    workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    enablePulse: true,
    enableSmartCarryover: true,
    weeklyReport: {
        enabled: true,
        day: "Fri",
        time: "18:00"
    },
    morningBriefing: {
        enabled: true,
        time: "07:00"
    }
}

interface SettingsContextType {
    settings: TeamSettings
    teamId: string | null
    updateSettings: (newSettings: Partial<TeamSettings>) => void
    isLoading: boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<TeamSettings>(DEFAULT_SETTINGS)
    const [teamId, setTeamId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    // Hybrid Load: Try DB (Scalable), Fallback to Local (MVP)
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // 1. Try LocalStorage fetch first for speed/offline (Optimistic UI)
                const localSaved = localStorage.getItem("status_loop_settings")
                if (localSaved) {
                    try {
                        const parsed = JSON.parse(localSaved);
                        // Merge with default to ensure new keys exist
                        setSettings(prev => ({
                            ...prev,
                            ...parsed,
                            weeklyReport: { ...prev.weeklyReport, ...(parsed.weeklyReport || {}) },
                            morningBriefing: { ...prev.morningBriefing, ...(parsed.morningBriefing || {}) }
                        }))
                    } catch (e) {
                        // ignore invalid json
                    }
                }

                // 2. Fetch from DB using team_members (not profiles.team_id which doesn't exist)
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // Get user's first team from team_members
                    const { data: membership } = await supabase
                        .from('team_members')
                        .select('team_id')
                        .eq('user_id', user.id)
                        .limit(1)
                        .maybeSingle()

                    if (membership?.team_id) {
                        setTeamId(membership.team_id)
                        const { data: team } = await supabase.from('teams').select('settings').eq('id', membership.team_id).single()
                        if (team?.settings) {
                            // Deep merge is safer, but shallow merge of top keys works if structure is flat. 
                            // weeklyReport is nested, so we need careful merging.
                            const remoteSettings = team.settings as unknown as Partial<TeamSettings>;
                            setSettings(prev => ({
                                ...prev,
                                ...remoteSettings,
                                weeklyReport: {
                                    ...prev.weeklyReport,
                                    ...(remoteSettings.weeklyReport || {})
                                },
                                morningBriefing: {
                                    ...prev.morningBriefing,
                                    ...(remoteSettings.morningBriefing || {})
                                }
                            }))
                        }
                    }
                }
            } catch (e) {
                console.error("Settings load error", e)
            } finally {
                setIsLoading(false)
            }
        }
        loadSettings()
    }, [])

    const updateSettings = async (newSettings: Partial<TeamSettings>) => {
        // Optimistic Update
        const updated = {
            ...settings,
            ...newSettings,
            weeklyReport: {
                ...settings.weeklyReport,
                ...(newSettings.weeklyReport || {})
            },
            morningBriefing: {
                ...settings.morningBriefing,
                ...(newSettings.morningBriefing || {})
            }
        }
        setSettings(updated)

        // 1. Save Local
        try {
            localStorage.setItem("status_loop_settings", JSON.stringify(updated))
        } catch (error) {
            console.error("Local save failed", error)
        }

        // 2. Save Remote
        try {
            if (teamId) {
                // Update team settings in DB
                // We assume the Team row exists. If not, this silently fails in this implementation, 
                // but fixing the "Create Team" flow is out of scope.
                await supabase.from('teams').update({ settings: updated }).eq('id', teamId)
            }
        } catch (error) {
            console.error("Remote save failed", error)
        }
    }

    return (
        <SettingsContext.Provider value={{ settings, teamId, updateSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (!context) throw new Error("useSettings must be used within SettingsProvider")
    return context
}
