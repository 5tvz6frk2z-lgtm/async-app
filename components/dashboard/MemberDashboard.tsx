"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Loader2, PlusCircle, LogOut, LayoutDashboard, Repeat } from "lucide-react"
import Link from "next/link"
import { TeamSwitcher } from "@/components/dashboard/TeamSwitcher"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { SentimentPulse } from "@/components/dashboard/SentimentPulse"
import { LeaveTeamDialog } from "@/components/team/LeaveTeamDialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Settings, Pencil, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateProfileName } from "@/app/(app)/profile/actions"

interface Report {
    id: string
    date: string
    created_at: string
    sentiment: "green" | "yellow" | "red"
    blockers: string | null
    plan_items: {
        content: string
        type: "plan_for_tomorrow" | "actual_done_today"
        status: "todo" | "done"
        is_priority: boolean
    }[]
}

export function MemberDashboard() {
    const [reports, setReports] = useState<Report[]>([])
    const [loading, setLoading] = useState(true)
    const [userEmail, setUserEmail] = useState<string>("")
    const [userName, setUserName] = useState<string>("")
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const fetchReports = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser()

            if (authError || !user) {
                console.error("Auth error:", authError)
                toast.error("Failed to load profile. Please log in again.")
                setLoading(false)
                router.push("/login")
                return
            }

            setUserEmail(user.email || "")
            // Use metadata name or fallback to email username
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Member"
            setUserName(name)

            // Fetch reports with plan items
            const { data, error } = await supabase
                .from("reports")
                .select(`
                    *,
                    plan_items (
                        content,
                        type,
                        status,
                        is_priority
                    )
                `)
                .eq("user_id", user.id)
                .order("date", { ascending: false })
                .limit(20) // Fetch a bit more for history context

            if (error) {
                console.error("Error fetching reports:", error)
                toast.error("Failed to load your reports")
            } else {
                // @ts-ignore
                setReports(data || [])
            }
            setLoading(false)
        }

        fetchReports()
    }, [supabase, router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const getGreeting = () => {
        return "Hi"
    }

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
    }

    const latestReport = reports[0]

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white">
            <div className="max-w-5xl mx-auto px-4 py-8 pb-12 space-y-8">
                {/* 0. Brand Header (Member View) */}
                <Link href="/" className="flex items-center gap-2 w-fit hover:opacity-80 transition-opacity cursor-pointer">
                    <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
                        <Repeat className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Status Loop</span>
                </Link>

                {/* 1. Header with Greeting & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                                {getGreeting()}, {userName}
                            </h1>
                            <EditProfileDialog currentName={userName} onUpdate={setUserName} />
                        </div>
                        <p className="text-lg text-slate-500 font-light">Ready to sync your progress?</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <TeamSwitcher />
                        <Link href="/daily">
                            <Button className="h-10 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 text-sm font-medium">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Start Daily Loop
                            </Button>
                        </Link>

                        {/* Settings Dialog */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100/80" title="Member Settings">
                                    <Settings className="w-5 h-5 text-slate-500" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Member Settings</DialogTitle>
                                    <DialogDescription>
                                        Manage your membership and preferences.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 pt-4">
                                    <Link href="/profile" className="block">
                                        <Button variant="outline" className="w-full justify-start h-12 text-base">
                                            <User className="mr-3 w-5 h-5 text-indigo-500" />
                                            Edit Profile & Avatar
                                        </Button>
                                    </Link>

                                    <div className="p-4 border border-red-100 bg-red-50 rounded-lg space-y-3">
                                        <h4 className="text-sm font-medium text-red-900">Danger Zone</h4>
                                        <p className="text-xs text-red-700">
                                            Leaving the team will permanently delete your reports and history associated with this team.
                                        </p>
                                        <LeaveTeamDialog />
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out" className="rounded-full hover:bg-slate-100/80">
                            <LogOut className="w-5 h-5 text-slate-500" />
                        </Button>
                    </div>
                </div>

                {/* 2. Stats & Pulse Row */}
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-1">
                        <StatsCards reports={reports} />
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6 flex flex-col justify-center">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Sentiment Pulse</h3>
                        </div>
                        <SentimentPulse reports={reports} />
                    </div>
                </div>

                {/* 3. Latest Report (Premium Card) */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                                <LayoutDashboard className="w-4 h-4" />
                            </div>
                            Latest Update
                        </h2>
                    </div>

                    {latestReport ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                            <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="text-sm font-semibold text-indigo-900">
                                        {format(new Date(latestReport.date), "EEEE, MMMM d, yyyy")}
                                    </div>
                                    <div className="text-xs text-slate-400 font-medium">
                                        Submitted at {format(new Date(latestReport.created_at), "h:mm a")}
                                    </div>
                                </div>
                                <Badge
                                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-sm border ${latestReport.sentiment === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        latestReport.sentiment === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            'bg-rose-50 text-rose-700 border-rose-100'
                                        }`}
                                    variant="outline"
                                >
                                    {latestReport.sentiment}
                                </Badge>
                            </div>

                            <div className="p-6 md:p-8 space-y-8">
                                {latestReport.blockers && (
                                    <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 text-rose-900 text-sm flex gap-3 items-start shadow-sm">
                                        <span className="font-bold shrink-0 flex items-center gap-1.5 text-rose-600">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Blockers:
                                        </span>
                                        <p className="leading-relaxed">{latestReport.blockers}</p>
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                            Done Today
                                        </h3>
                                        <ul className="space-y-3">
                                            {latestReport.plan_items.filter(i => i.type === 'actual_done_today').map((item, idx) => (
                                                <li key={idx} className="flex gap-3 text-slate-600 text-sm group">
                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-200 group-hover:scale-125 transition-transform" />
                                                    <span className="leading-relaxed">{item.content}</span>
                                                </li>
                                            ))}
                                            {latestReport.plan_items.filter(i => i.type === 'actual_done_today').length === 0 && (
                                                <li className="text-slate-400 italic text-sm">Nothing recorded.</li>
                                            )}
                                        </ul>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                                            Plan for Tomorrow
                                        </h3>
                                        <ul className="space-y-3">
                                            {latestReport.plan_items.filter(i => i.type === 'plan_for_tomorrow').map((item, idx) => (
                                                <li key={idx} className="flex gap-3 text-slate-600 text-sm group">
                                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 shadow-sm shadow-indigo-200 group-hover:scale-125 transition-transform" />
                                                    <span className={`leading-relaxed ${item.is_priority ? "font-medium text-slate-900" : ""}`}>
                                                        {item.content}
                                                        {item.is_priority && (
                                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 uppercase tracking-wide border border-rose-100">
                                                                Priority
                                                            </span>
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                            {latestReport.plan_items.filter(i => i.type === 'plan_for_tomorrow').length === 0 && (
                                                <li className="text-slate-400 italic text-sm">No plan set.</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <PlusCircle className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No updates yet</h3>
                            <p className="text-slate-500 mb-6">Complete your first status loop to see your stats.</p>
                            <Link href="/daily">
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">Start First Loop</Button>
                            </Link>
                        </div>
                    )}
                </div>

                {/* 4. History List (Compact) */}
                {reports.length > 1 && (
                    <div className="pt-8 border-t border-slate-200/60">
                        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-wide">
                            Previous History
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {reports.slice(1).map((report) => (
                                <div key={report.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-indigo-100 transition-all group cursor-default shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant="outline" className={`
                                            ${report.sentiment === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                report.sentiment === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-rose-50 text-rose-700 border-rose-100'
                                            } uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full
                                        `}>
                                            {report.sentiment}
                                        </Badge>
                                        <span className="text-xs font-medium text-slate-400">
                                            {format(new Date(report.date), "MMM d")}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium line-clamp-2 leading-relaxed text-slate-600 group-hover:text-indigo-900 transition-colors">
                                        {/* Show preview of work done */}
                                        {report.plan_items.find(i => i.type === 'actual_done_today')?.content || "No items recorded"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}


function EditProfileDialog({ currentName, onUpdate }: { currentName: string, onUpdate: (name: string) => void }) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(currentName)
    const [loading, setLoading] = useState(false)

    // Sync input when props change
    useEffect(() => {
        setName(currentName)
    }, [currentName])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updateProfileName(name)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Profile updated successfully")
            onUpdate(name) // Optimistic update

            // Refetch to ensure consistency with database
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.full_name) {
                onUpdate(user.user_metadata.full_name)
            }

            setOpen(false)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 -ml-1 h-8 w-8 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit Name">
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your display name across the workspace.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pl-9"
                                placeholder="Your full name"
                                maxLength={100}
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            This is how you'll appear in daily reports and team views.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
