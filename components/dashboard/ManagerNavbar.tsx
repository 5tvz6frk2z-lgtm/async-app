"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import { TeamSwitcher } from "@/components/dashboard/TeamSwitcher"
import { LayoutDashboard, Settings, Users, CreditCard, LogOut, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export function ManagerNavbar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { currentTeam, user, profile } = useAuth()
    const [open, setOpen] = useState(false)

    const isActive = (path: string) => pathname === path

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const navigation = [
        { name: 'Reports', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Team', href: '/dashboard/team', icon: Users },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ]

    return (
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left: Logo and Team Switcher */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                                <Repeat className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-lg tracking-tight text-slate-900 hidden sm:block">Status Loop</span>
                        </Link>
                        <div className="h-6 w-px bg-slate-200/80 hidden sm:block" />
                        <TeamSwitcher />
                    </div>

                    {/* Center: Desktop Navigation */}
                    <div className="hidden md:flex md:space-x-8">
                        {navigation.map((item) => (
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

                    {/* Right: User Menu (Desktop) & Mobile Toggle */}
                    <div className="flex items-center gap-4">
                        {/* Desktop User Menu */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/profile" className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-full transition-colors group">
                                <Avatar className="h-8 w-8 border border-slate-200">
                                    <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || undefined} />
                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                                        {(profile?.name || user?.email)?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-slate-600 group-hover:text-slate-900 font-medium">
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

                        {/* Mobile Menu Toggle */}
                        <div className="md:hidden">
                            <Sheet open={open} onOpenChange={setOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="md:hidden">
                                        <Menu className="h-6 w-6 text-slate-600" />
                                        <span className="sr-only">Open menu</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                                    <SheetHeader className="mb-6 text-left">
                                        <SheetTitle className="flex items-center gap-2">
                                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
                                                <Repeat className="w-4 h-4" />
                                            </div>
                                            Status Loop
                                        </SheetTitle>
                                    </SheetHeader>
                                    <div className="flex flex-col gap-6">
                                        {/* Mobile Navigation Links */}
                                        <div className="flex flex-col gap-2">
                                            <h4 className="text-sm font-medium text-slate-500 px-2 mb-2">Menu</h4>
                                            {navigation.map((item) => (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    onClick={() => setOpen(false)}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href)
                                                        ? "bg-indigo-50 text-indigo-700"
                                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                        }`}
                                                >
                                                    <item.icon className={`w-4 h-4 ${isActive(item.href) ? "text-indigo-600" : "text-slate-400"}`} />
                                                    {item.name}
                                                </Link>
                                            ))}
                                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 cursor-not-allowed">
                                                <CreditCard className="w-4 h-4" />
                                                Billing
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-100" />

                                        {/* Mobile User Section */}
                                        <div className="flex flex-col gap-2">
                                            <h4 className="text-sm font-medium text-slate-500 px-2 mb-2">Account</h4>
                                            <Link
                                                href="/profile"
                                                onClick={() => setOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                                            >
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || undefined} />
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px]">
                                                        {(profile?.name || user?.email)?.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                Profile Settings
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    setOpen(false)
                                                    handleSignOut()
                                                }}
                                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors w-full text-left"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}
