import { UseFormReturn } from "react-hook-form"
import { DailyReportFormValues } from "@/lib/schemas/daily-report"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { useSettings } from "@/components/providers/SettingsProvider"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlanningStepProps {
    form: UseFormReturn<DailyReportFormValues>
}

export function PlanningStep({ form }: PlanningStepProps) {
    const { settings } = useSettings()

    // Calculate the next working day label
    const getNextWorkDayLabel = () => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

        // Use local time for now. In a real app, might want to use team timezone.
        const today = new Date()
        const currentDayIndex = today.getDay()

        // Look ahead up to 7 days to find the next active work day
        for (let i = 1; i <= 7; i++) {
            const nextIndex = (currentDayIndex + i) % 7
            const nextDayShort = days[nextIndex]

            // If this day is in our workDays settings
            if (settings.workDays.includes(nextDayShort)) {
                // If it's literally tomorrow (i=1), say "Tomorrow"
                if (i === 1) return "Tomorrow"
                // Otherwise return the full name, e.g. "Monday"
                return fullDayNames[nextIndex]
            }
        }

        // Fallback if no work days found or other issue
        return "Tomorrow"
    }

    const nextWorkDayLabel = getNextWorkDayLabel()

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-lg font-medium text-slate-900">Plan for {nextWorkDayLabel}</h2>
                <p className="text-slate-500 text-sm">What will you aim to complete {nextWorkDayLabel.toLowerCase()}?</p>
            </div>

            <FormField
                control={form.control}
                name="today_plan"
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <div className="space-y-3">
                                <Textarea
                                    placeholder="- Finish the API endpoint..."
                                    className="min-h-[200px] border-slate-200 focus:ring-indigo-100 focus:border-indigo-500 resize-none text-base font-normal leading-relaxed"
                                    {...field}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const start = e.currentTarget.selectionStart;
                                            const end = e.currentTarget.selectionEnd;
                                            const value = field.value || "";
                                            const newValue = value.substring(0, start) + "\n- " + value.substring(end);

                                            field.onChange(newValue);

                                            // Need to set cursor position after render, simplified for now
                                            // Ideally we use a ref and requestAnimationFrame or similar to set cursor
                                            setTimeout(() => {
                                                const newCursorPos = start + 3; // \n- (length 3)
                                                e.currentTarget.setSelectionRange(newCursorPos, newCursorPos);
                                            }, 0);
                                        }
                                    }}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100"
                                        onClick={() => {
                                            const value = field.value || "";
                                            const prefix = value.endsWith("\n") || value === "" ? "- " : "\n- ";
                                            const newValue = value + prefix;
                                            field.onChange(newValue);

                                            // Focus textarea
                                            const textarea = document.querySelector('textarea[name="today_plan"]') as HTMLTextAreaElement;
                                            if (textarea) {
                                                textarea.focus();
                                                // Set cursor to end
                                                setTimeout(() => {
                                                    textarea.setSelectionRange(newValue.length, newValue.length);
                                                }, 0);
                                            }
                                        }}
                                    >
                                        <PlusCircle className="w-4 h-4 mr-1.5" />
                                        Add Item
                                    </Button>
                                </div>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
