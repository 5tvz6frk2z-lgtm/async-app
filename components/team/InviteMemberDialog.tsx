"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Check, Copy, CreditCard, Loader2, Mail, UserPlus } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"

export function InviteMemberDialog() {
    const { currentTeam } = useAuth()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<"input" | "payment" | "success">("input")
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [inviteLink, setInviteLink] = useState("")

    const supabase = createClient()

    const handleNext = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email.trim() || !emailRegex.test(email)) {
            toast.error("Please enter a valid email address")
            return
        }
        setStep("payment")
    }

    const handlePaymentAndInvite = async () => {
        if (!currentTeam) return
        setLoading(true)
        const trimmedEmail = email.trim().toLowerCase()

        try {
            // Create Invitation Record directly
            const { data, error } = await supabase
                .from("invitations")
                .insert({
                    team_id: currentTeam.id,
                    email: trimmedEmail,
                    role: "member"
                })
                .select("token")
                .single()

            if (error) {
                console.error("Insert error:", error)
                // Check if it's a duplicate key error
                if (error.code === '23505') {
                    toast.error("An invitation for this email already exists. Check pending invitations.")
                } else {
                    toast.error("Failed to create invite: " + error.message)
                }
                return
            }

            // Generate Link
            const link = `${window.location.origin}/invite/${data.token}`
            setInviteLink(link)
            setStep("success")
            toast.success("Invite link generated!")

        } catch (error: any) {
            console.error("Invite error:", error)
            toast.error("Failed to create invite. " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink)
        toast.success("Link copied to clipboard")
    }

    const reset = () => {
        setOpen(false)
        setStep("input")
        setEmail("")
        setInviteLink("")
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && reset()}>
            <DialogTrigger asChild>
                <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite to {currentTeam?.name}</DialogTitle>
                    <DialogDescription>
                        Add a new member to your team.
                    </DialogDescription>
                </DialogHeader>

                {step === "input" && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email Address</label>
                            <Input
                                placeholder="colleague@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleNext} className="w-full">
                                Continue
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === "payment" && (
                    <div className="space-y-4 py-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center">
                                <CreditCard className="w-4 h-4 mr-2 text-indigo-600" />
                                Payment Summary
                            </h4>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-600">New Seat (Member)</span>
                                <span className="font-medium text-slate-900">$4.00</span>
                            </div>
                            <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                                <span className="font-bold text-slate-900">Total due today</span>
                                <span className="font-bold text-indigo-600">$4.00</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 text-center">
                            This is a secure mock payment for demonstration purposes.
                        </p>
                        <DialogFooter>
                            <Button onClick={handlePaymentAndInvite} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay & Generate Invite"}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {step === "success" && (
                    <div className="space-y-4 py-4">
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                                <Check className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900">Invite Created!</h3>
                            <p className="text-sm text-slate-500">Send this link to {email}</p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Input value={inviteLink} readOnly className="bg-slate-50" />
                            <Button size="icon" variant="outline" onClick={copyLink}>
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>

                        <DialogFooter>
                            <Button onClick={reset} variant="outline" className="w-full">
                                Done
                            </Button>
                        </DialogFooter>
                    </div>
                )}

            </DialogContent>
        </Dialog>
    )
}
