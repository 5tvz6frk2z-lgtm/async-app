import { UseFormReturn } from "react-hook-form"
import { DailyReportFormValues } from "@/lib/schemas/daily-report"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"

// We need a checkbox component. I'll use a simple custom one or text for now if Shadcn checkbox isn't installed.
// actually I realized I didn't install 'checkbox' from shadcn. I will use a simple button toggle for now or standard input.
// Let's use standard input for speed and "Zero-friction".

interface RetrospectiveStepProps {
    form: UseFormReturn<DailyReportFormValues>
    items: { id: string; content: string }[]
}

export function RetrospectiveStep({ form, items }: RetrospectiveStepProps) {
    const { setValue, watch } = form
    const doneItems = watch("yesterday_done") || []

    const toggleDone = (id: string) => {
        const isDone = doneItems.includes(id)
        if (isDone) {
            setValue("yesterday_done", doneItems.filter(i => i !== id))
        } else {
            setValue("yesterday_done", [...doneItems, id])
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-lg font-medium text-slate-900">What did you complete today?</h2>
                <p className="text-slate-500 text-sm">Select items you finished.</p>
            </div>

            <div className="space-y-3">
                {items.map(item => {
                    const isDone = doneItems.includes(item.id)
                    return (
                        <div
                            key={item.id}
                            onClick={() => toggleDone(item.id)}
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
                                {isDone && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
