"use client"

import { useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2 } from "lucide-react"
import { leaveTeamAction } from "@/app/actions/team"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function LeaveTeamDialog() {
    const { currentTeam } = useAuth()
    const [loading, setLoading] = useState(false)

    const handleLeave = async () => {
        if (!currentTeam) return
        setLoading(true)
        try {
            await leaveTeamAction(currentTeam.id)
            // Redirect happens in server action
        } catch (error: any) {
            console.error("Failed to leave team:", error)
            toast.error(error.message || "Failed to leave team")
            setLoading(false)
        }
    }

    if (!currentTeam) return null

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Team
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Leave {currentTeam.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. All your reports and data associated with this team will be permanently deleted.
                        You will need a new invite to rejoin.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleLeave()
                        }}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Delete Data & Leave
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
