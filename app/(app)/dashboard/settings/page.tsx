"use client"

import { useSettings } from "@/components/providers/SettingsProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Users, Clock, Zap, Save, Loader2, Mail, Sparkles } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"

export default function SettingsPage() {
    const { settings, updateSettings, teamId } = useSettings()
    const { role } = useAuth()
    const router = useRouter()

    // Redirect if not manager
    useEffect(() => {
        if (role === "member") {
            router.replace("/daily")
        }
    }, [role, router])

    // Local state for form
    const [teamName, setTeamName] = useState(settings.teamName)
    const [reminderTime, setReminderTime] = useState(settings.reminderTime)

    // Sync local state when settings load
    useEffect(() => {
        setTeamName(settings.teamName)
        setReminderTime(settings.reminderTime)
    }, [settings.teamName, settings.reminderTime])

    const handleSave = () => {
        updateSettings({ teamName, reminderTime })
        toast.success("Settings saved successfully")
    }

    const updateWeeklyReport = (field: string, value: any) => {
        updateSettings({
            weeklyReport: {
                ...settings.weeklyReport,
                [field]: value
            }
        })
    }

    const handleSendTestReport = () => {
        if (!teamId) {
            toast.error("Team ID not found. Cannot generate test report.");
            return;
        }
        window.open(`/api/cron/weekly-report?test=true&teamId=${teamId}`, '_blank');
    }

    if (role !== "manager") return null

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-100 rounded-xl">
                    <Users className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Settings</h1>
                    <p className="text-slate-500">Manage your team's configuration and preferences.</p>
                </div>
            </div>

            <div className="grid gap-8">
                {/* General Settings */}
                <Card className="bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            <CardTitle className="text-lg font-semibold text-slate-900">General Configuration</CardTitle>
                        </div>
                        <CardDescription>Basic details about your team workspace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="teamName" className="text-slate-700">Team Name</Label>
                                <Input
                                    id="teamName"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className="border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reminderTime" className="text-slate-700">Daily Reminder Time</Label>
                                <div className="flex items-center gap-4">
                                    <Select value={reminderTime} onValueChange={setReminderTime}>
                                        <SelectTrigger className="w-full border-slate-200">
                                            <SelectValue placeholder="Select time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="08:00">8:00 AM</SelectItem>
                                            <SelectItem value="09:00">9:00 AM</SelectItem>
                                            <SelectItem value="10:00">10:00 AM</SelectItem>
                                            <SelectItem value="16:00">4:00 PM</SelectItem>
                                            <SelectItem value="17:00">5:00 PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-xs text-slate-400">Time zone is handled automatically.</p>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200">
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Weekly Report Settings */}
                <Card className="bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-indigo-500" />
                            <CardTitle className="text-lg font-semibold text-slate-900">Weekly Roll-Up Report</CardTitle>
                        </div>
                        <CardDescription>Configure the automatic end-of-week summary email.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-slate-900">Enable Weekly Report</Label>
                                <p className="text-sm text-slate-500">
                                    Automatically send a summary of team highlights and blockers.
                                </p>
                            </div>
                            <Switch
                                checked={settings.weeklyReport.enabled}
                                onCheckedChange={(checked) => updateWeeklyReport("enabled", checked)}
                                className="data-[state=checked]:bg-indigo-600"
                            />
                        </div>

                        {settings.weeklyReport.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label>Send On</Label>
                                    <Select
                                        value={settings.weeklyReport.day}
                                        onValueChange={(val) => updateWeeklyReport("day", val)}
                                    >
                                        <SelectTrigger className="border-slate-200">
                                            <SelectValue placeholder="Select Day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Mon">Monday</SelectItem>
                                            <SelectItem value="Tue">Tuesday</SelectItem>
                                            <SelectItem value="Wed">Wednesday</SelectItem>
                                            <SelectItem value="Thu">Thursday</SelectItem>
                                            <SelectItem value="Fri">Friday</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>At Time</Label>
                                    <Select
                                        value={settings.weeklyReport.time}
                                        onValueChange={(val) => updateWeeklyReport("time", val)}
                                    >
                                        <SelectTrigger className="border-slate-200">
                                            <SelectValue placeholder="Select Time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="16:00">4:00 PM</SelectItem>
                                            <SelectItem value="17:00">5:00 PM</SelectItem>
                                            <SelectItem value="18:00">6:00 PM</SelectItem>
                                            <SelectItem value="19:00">7:00 PM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-full pt-2">
                                    <Button variant="outline" onClick={handleSendTestReport} className="w-full sm:w-auto text-slate-600 border-slate-200 hover:bg-slate-50">
                                        <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                                        Send Test Report Now
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Morning Briefing Settings */}
                <Card className="bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                            <CardTitle className="text-lg font-semibold text-slate-900">Morning Briefing</CardTitle>
                        </div>
                        <CardDescription>Configure the daily AI summary of your team's previous day.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-slate-900">Enable Morning Briefing</Label>
                                <p className="text-sm text-slate-500">
                                    Automatically generate a summary of yesterday's achievements and today's plans.
                                </p>
                            </div>
                            <Switch
                                checked={settings.morningBriefing.enabled}
                                onCheckedChange={(checked) => updateSettings({
                                    morningBriefing: { ...settings.morningBriefing, enabled: checked }
                                })}
                                className="data-[state=checked]:bg-indigo-600"
                            />
                        </div>

                        {settings.morningBriefing.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label>Send At</Label>
                                    <Select
                                        value={settings.morningBriefing.time}
                                        onValueChange={(val) => updateSettings({
                                            morningBriefing: { ...settings.morningBriefing, time: val }
                                        })}
                                    >
                                        <SelectTrigger className="border-slate-200">
                                            <SelectValue placeholder="Select Time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="06:00">6:00 AM</SelectItem>
                                            <SelectItem value="07:00">7:00 AM</SelectItem>
                                            <SelectItem value="08:00">8:00 AM</SelectItem>
                                            <SelectItem value="09:00">9:00 AM</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-full pt-2">
                                    <p className="text-xs text-slate-400">
                                        Briefing includes critical blockers, achievements from yesterday, and plans for today.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Feature Toggles */}
                <Card className="bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-indigo-500" />
                            <CardTitle className="text-lg font-semibold text-slate-900">Features & Experiments</CardTitle>
                        </div>
                        <CardDescription>Enable or disable specific functionality for your team.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-slate-900">Team Pulse Feed</Label>
                                <p className="text-sm text-slate-500">
                                    Show a feed of teammate statuses after submission.
                                </p>
                            </div>
                            <Switch
                                checked={settings.enablePulse}
                                onCheckedChange={(checked) => updateSettings({ enablePulse: checked })}
                                className="data-[state=checked]:bg-indigo-600"
                            />
                        </div>
                        <div className="h-px bg-slate-100" />
                        <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors">
                            <div className="space-y-0.5">
                                <Label className="text-base font-medium text-slate-900">Smart Carryover</Label>
                                <p className="text-sm text-slate-500">
                                    Allow members to one-click carry over unfinished items.
                                </p>
                            </div>
                            <Switch
                                checked={settings.enableSmartCarryover}
                                onCheckedChange={(checked) => updateSettings({ enableSmartCarryover: checked })}
                                className="data-[state=checked]:bg-indigo-600"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
