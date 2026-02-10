"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/AuthProvider"

function LoginForm() {
    const [loading, setLoading] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"manager" | "member">("manager")
    const { refreshUser } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const nextUrl = searchParams.get("next")

    const handleLogin = async (role: "manager" | "member", formEmail?: string, formPassword?: string) => {
        setLoading(formEmail ? "form" : role)

        let email = formEmail
        let password = formPassword

        // Fallback for demo buttons
        if (!email) {
            email = role === "manager" ? "manager@test.com" : "member@test.com"
            password = "password"
        }

        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: email!,
                password: password!,
            })

            if (error) {
                toast.error("Login failed: " + error.message)
                return
            }

            // Sync AuthProvider state immediately
            await refreshUser()

            // Check actual role from team_members table
            const { data: memberships } = await supabase
                .from("team_members")
                .select("role")
                .eq("user_id", authData.user.id)

            const isManager = memberships?.some(m => m.role === 'manager')
            const hasMembership = memberships && memberships.length > 0

            toast.success(`Logged in successfully`)

            // Redirect based on ACTUAL role, not requested role
            if (nextUrl) {
                router.push(nextUrl)
            } else if (!hasMembership) {
                // No team membership - go to onboarding
                router.push("/onboarding")
            } else if (isManager) {
                router.push("/dashboard") // Manager workflow
            } else {
                router.push("/daily") // Member workflow -> daily wizard
            }

        } catch (err) {
            console.error(err)
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Or <a href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">start your 14-day free trial</a>
                    </p>
                </div>

                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex p-1 bg-slate-100 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setActiveTab("manager")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "manager"
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Manager
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("member")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "member"
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <User className="w-4 h-4" />
                                Member
                            </button>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-6">
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            handleLogin(activeTab, formData.get("email") as string, formData.get("password") as string)
                        }} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder={activeTab === "manager" ? "manager@company.com" : "member@company.com"}
                                    required
                                    defaultValue={searchParams.get("email") || ""}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                                <Input id="password" name="password" type="password" required />
                            </div>
                            <Button type="submit" disabled={!!loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                {loading === "form" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign in as {activeTab === "manager" ? "Manager" : "Member"}
                            </Button>
                        </form>

                        {process.env.NODE_ENV === 'development' && (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-slate-500">Or use demo account</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Button variant="outline" onClick={() => handleLogin("member")} disabled={!!loading} className="text-xs">
                                        Demo Member
                                    </Button>
                                    <Button variant="outline" onClick={() => handleLogin("manager")} disabled={!!loading} className="text-xs">
                                        Demo Manager
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    )
}
