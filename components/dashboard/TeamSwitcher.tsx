"use client"

import Link from "next/link"
import { useAuth } from "@/components/providers/AuthProvider"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function TeamSwitcher() {
    const { currentTeam, teams, switchTeam } = useAuth()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between border-slate-200 text-slate-700 bg-white">
                    {currentTeam?.name || "Select Team"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] bg-white">
                <DropdownMenuLabel>My Teams</DropdownMenuLabel>
                {teams.map((team) => (
                    <DropdownMenuItem
                        key={team.id}
                        onSelect={() => switchTeam(team.id)}
                        className="cursor-pointer"
                    >
                        <div className="flex items-center justify-between w-full">
                            {team.name}
                            {currentTeam?.id === team.id && <Check className="h-4 w-4 text-indigo-600" />}
                        </div>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
