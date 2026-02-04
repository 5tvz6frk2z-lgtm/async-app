import { UseFormReturn } from "react-hook-form"
import { DailyReportFormValues } from "@/lib/schemas/daily-report"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

interface PlanningStepProps {
    form: UseFormReturn<DailyReportFormValues>
}

export function PlanningStep({ form }: PlanningStepProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-lg font-medium text-slate-900">Today's Plan</h2>
                <p className="text-slate-500 text-sm">What will you aim to complete today?</p>
            </div>

            <FormField
                control={form.control}
                name="today_plan"
                render={({ field }) => (
                    <FormItem>
                        <FormControl>
                            <Textarea
                                placeholder="- Finish the API endpoint&#10;- Call with design team&#10;- Update documentation"
                                className="min-h-[200px] border-slate-200 focus:ring-indigo-100 focus:border-indigo-500 resize-none text-base"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}
