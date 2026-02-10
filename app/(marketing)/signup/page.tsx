"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

function SignupForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const inviteRole = searchParams.get("role")
    const nextUrl = searchParams.get("next")
    const inviteEmail = searchParams.get("email")
    const isInvite = !!nextUrl

    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState(inviteEmail || "")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [verificationSent, setVerificationSent] = useState(false)

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: inviteRole === 'member' ? 'member' : 'manager'
                    }
                }
            })

            if (error) {
                toast.error(error.message)
                return
            }

            if (data.session) {
                // Auto-login successful
                // Create/update profile with name
                await supabase.from('profiles').upsert({
                    id: data.user!.id,
                    name: fullName,
                    email: email
                }, { onConflict: 'id' })

                toast.success("Account created successfully!")
                if (nextUrl) {
                    router.push(nextUrl)
                } else {
                    router.push("/onboarding")
                }
            } else if (data.user) {
                // User created but verification required
                // Show Verification UI
                setVerificationSent(true)
                toast.success("Please check your email to verify your account.")
            }
        } catch (err) {
            console.error(err)
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    if (verificationSent) {
        return (
            <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">✉️</span>
                        </div>
                        <CardTitle>Check your email</CardTitle>
                        <CardDescription>
                            We've sent a verification link to <strong>{email}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 mb-4">
                            Please check your inbox (and spam folder) to confirm your account.
                            Once verified, you can log in to join the team.
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Link href={nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login"}>
                            <Button variant="outline">Back to Log in</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        {isInvite ? "Join your team" : "Create an account"}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isInvite
                            ? "Create an account to accept the invitation."
                            : "Start your team for free. No credit card required."}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignup}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="John Smith"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Work Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={!!inviteEmail}
                                className={inviteEmail ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}
                            />
                            {inviteEmail && <p className="text-xs text-slate-500 mt-1">Email locked for invitation</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pt-4">
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isInvite ? "Create Account & Join" : "Create Account"}
                        </Button>
                        <div className="text-sm text-center text-slate-500">
                            Already have an account?{" "}
                            <Link href={nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login"} className="text-indigo-600 hover:underline">
                                Log in
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupForm />
        </Suspense>
    )
}

