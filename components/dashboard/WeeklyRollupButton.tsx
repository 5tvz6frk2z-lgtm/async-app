"use client"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function WeeklyRollupButton() {
    const handleGenerate = () => {
        // Mock generation logic
        // In real app: Fetch all 'done' items from last 5 days
        const mockSummary = `
Weekly Summary (Oct 23 - Oct 27):
- Alice: Fixed navbar bug, Implement hero section
- Bob: Database schema, Auth setup, API Routes
- Charlie: Research payment gateways
    `.trim()

        toast.info("Weekly Report Generated", {
            description: (
                <pre className="mt-2 w-full rounded-md bg-slate-950 p-4 text-xs text-white overflow-auto">
                    {mockSummary}
                </pre>
            ),
            duration: 10000,
        })
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
        >
            Generate Weekly Roll-up
        </Button>
    )
}
