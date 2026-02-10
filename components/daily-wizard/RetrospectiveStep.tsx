"use client"

import { useState } from "react"
import { UseFormReturn } from "react-hook-form"
import { DailyReportFormValues } from "@/lib/schemas/daily-report"
import { FormLabel } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSettings } from "@/components/providers/SettingsProvider"
import { toast } from "sonner"
import { Plus, X, Check } from "lucide-react"

interface RetrospectiveStepProps {
    form: UseFormReturn<DailyReportFormValues>
    items: { id: string; content: string }[]
}

export function RetrospectiveStep({ form, items }: RetrospectiveStepProps) {
    const { setValue, watch } = form
    const doneItems = watch("yesterday_done") || []
    const todayCompleted = watch("today_completed") || []

    // Local state for unplanned items input
    const [newItemText, setNewItemText] = useState("")

    // Feature Toggle
    const { settings } = useSettings()

    // 1. Toggle Yesterday's Planned Items
    const toggleDone = (id: string, content: string) => {
        const isDone = doneItems.includes(id)

        if (isDone) {
            // Uncheck
            setValue("yesterday_done", doneItems.filter(i => i !== id))
            // Remove from completed list IF it matches content (Smart Carryover Logic)
            if (settings?.enableSmartCarryover) {
                setValue("today_completed", todayCompleted.filter(c => c !== content))
            }
        } else {
            // Check
            setValue("yesterday_done", [...doneItems, id])

            // Smart Carryover: Add to completed list
            if (settings?.enableSmartCarryover) {
                if (!todayCompleted.includes(content)) {
                    setValue("today_completed", [...todayCompleted, content])
                    toast.success("Added to completed list")
                }
            }
        }
    }

    // 2. Add Unplanned Item
    const addUnplanned = () => {
        if (!newItemText.trim()) return

        if (!todayCompleted.includes(newItemText)) {
            setValue("today_completed", [...todayCompleted, newItemText])
            setNewItemText("")
            toast.success("Unplanned item added!")
        }
    }

    // 3. Remove Item from Completed List (allows correcting mistakes)
    const removeCompleted = (content: string) => {
        setValue("today_completed", todayCompleted.filter(c => c !== content))

        // Also uncheck from yesterday_done if it matches there?
        // Finding the ID... technically we should uncheck it if we remove it from done list.
        const linkedItem = items.find(i => i.content === content)
        if (linkedItem && doneItems.includes(linkedItem.id)) {
            setValue("yesterday_done", doneItems.filter(id => id !== linkedItem.id))
        }
    }

    return (
        <div className="space-y-8">
            {/* SECTION 1: Review Yesterday's Plan */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-medium text-slate-900">What did you complete today?</h2>
                    <p className="text-slate-500 text-sm">Select items you finished from yesterday's plan.</p>
                </div>

                <div className="space-y-3">
                    {items.map(item => {
                        const isDone = doneItems.includes(item.id)
                        return (
                            <div
                                key={item.id}
                                onClick={() => toggleDone(item.id, item.content)}
                                className={`
                    p-4 rounded-lg border cursor-pointer transition-all duration-200
                    flex items-center justify-between
                    ${isDone
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-white border-slate-200 hover:border-indigo-300"
                                    }
                  `}
                            >
                                <span className={`text-sm ${isDone ? "text-emerald-900 line-through opacity-70" : "text-slate-700"}`}>
                                    {item.content}
                                </span>
                                <div className={`
                    w-6 h-6 rounded-full border flex items-center justify-center
                    ${isDone
                                        ? "bg-emerald-500 border-emerald-500 text-white"
                                        : "bg-white border-slate-300"
                                    }
                  `}>
                                    {isDone && <Check className="h-4 w-4" />}
                                </div>
                            </div>
                        )
                    })}
                    {items.length === 0 && (
                        <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500 text-sm italic">
                            No plan items found from yesterday.
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 2: Unplanned / Additional Items */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-slate-900">Unplanned / Other Completed Items</h3>
                    <p className="text-slate-500 text-xs">Add anything else you finished today that wasn't on the plan.</p>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="E.g. Helped debug production issue..."
                        value={newItemText}
                        onChange={e => setNewItemText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUnplanned())}
                        className="flex-1"
                    />
                    <Button type="button" onClick={addUnplanned} variant="secondary">
                        <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                </div>

                {/* Display 'today_completed' items that are NOT in 'items' (Unplanned)? 
                    Actually, let's display ALL valid completed items here so user sees the final list?
                    Or just the unplanned ones? 
                    User asked to "add text field". Seeing the result is good.
                    Let's show the Full Completed Summary briefly.
                */}
                {todayCompleted.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <FormLabel className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Summary of Today's Accomplishments</FormLabel>
                        <div className="space-y-2">
                            {todayCompleted.map((content, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 text-sm">
                                    <span>{content}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeCompleted(content)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
