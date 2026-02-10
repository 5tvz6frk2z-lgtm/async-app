"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import { TeamSwitcher } from "@/components/dashboard/TeamSwitcher"
import { LayoutDashboard, Settings, Users, CreditCard, LogOut, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function ManagerNavbar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { currentTeam, user, profile } = useAuth()

    const isActive = (path: string) => pathname === path

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center mr-8 gap-4">
                            <Link href="/" className="flex items-center gap-2 group">
                                <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                                    <Repeat className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-lg tracking-tight text-slate-900">Status Loop</span>
                            </Link>
                            <div className="h-6 w-px bg-slate-200/80" />
                            {/* Team Switcher */}
                            <TeamSwitcher />
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {[
                                { name: 'Reports', href: '/dashboard', icon: LayoutDashboard },
                                { name: 'Team', href: '/dashboard/team', icon: Users },
                                { name: 'Settings', href: '/dashboard/settings', icon: Settings },
                            ].map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${isActive(item.href)
                                        ? "border-indigo-500 text-indigo-900"
                                        : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                                        }`}
                                >
                                    <item.icon className={`w-4 h-4 mr-2 ${isActive(item.href) ? "text-indigo-500" : "text-slate-400 group-hover:text-slate-500"}`} />
                                    {item.name}
                                </Link>
                            ))}

                            <span className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-slate-300 cursor-not-allowed">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Billing
                            </span>
                        </div>
                    </div>
                    {/* Right side - User menu & Sign Out */}
                    <div className="flex items-center gap-4">
                        <Link href="/profile" className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-full transition-colors group">
                            <Avatar className="h-8 w-8 border border-slate-200">
                                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || undefined} />
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                                    {(profile?.name || user?.email)?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-600 group-hover:text-slate-900 font-medium hidden md:block">
                                {profile?.name || user?.email}
                            </span>
                        </Link>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOut}
                            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
