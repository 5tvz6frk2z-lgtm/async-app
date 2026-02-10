"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface EditReportDialogProps {
    report: {
        id: string
        sentiment: "green" | "yellow" | "red"
        today_plan: { id: string; content: string; is_priority: boolean }[]
    }
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (id: string, updates: { sentiment: "green" | "yellow" | "red"; today_plan: string[] }) => void
}

export function EditReportDialog({ report, open, onOpenChange, onSave }: EditReportDialogProps) {
    const [sentiment, setSentiment] = useState(report.sentiment)
    // Extract content from objects for the text area
    const [planText, setPlanText] = useState(report.today_plan.map(item => item.content).join("\n"))

    const handleSave = () => {
        const newPlan = planText.split("\n").filter(line => line.trim() !== "")
        onSave(report.id, { sentiment, today_plan: newPlan })
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Manager Intervention</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Sentiment Status</Label>
                        <RadioGroup
                            value={sentiment}
                            onValueChange={(v) => setSentiment(v as "green" | "yellow" | "red")}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="green" id="green" />
                                <Label htmlFor="green" className="text-emerald-700">On Track</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yellow" id="yellow" />
                                <Label htmlFor="yellow" className="text-amber-700">Caution</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="red" id="red" />
                                <Label htmlFor="red" className="text-rose-700">Behind</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="plan">Today's Plan</Label>
                        <Textarea
                            id="plan"
                            value={planText}
                            onChange={(e) => setPlanText(e.target.value)}
                            className="min-h-[150px]"
                            placeholder="Edit tasks or add new ones..."
                        />
                        <p className="text-xs text-slate-500">Edit lines to modify tasks. Add new lines to assign new tasks.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
