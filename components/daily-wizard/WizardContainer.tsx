"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { dailyReportSchema, type DailyReportFormValues } from "@/lib/schemas/daily-report"
import { Form } from "@/components/ui/form"
import { RetrospectiveStep } from "./RetrospectiveStep"
import { PlanningStep } from "./PlanningStep"
import { BlockerStep } from "./BlockerStep"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// Mock data for yesterday's plan (Replace with DB fetch later)
const MOCK_YESTERDAY_ITEMS = [
    { id: "1", content: "Fix the login bug" },
    { id: "2", content: "Update API documentation" },
    { id: "3", content: "Review PR #42" },
    { id: "4", content: "Investigate performance regression" }, // This one will be 'in the middle of'
]

export function WizardContainer() {
    const [step, setStep] = useState(1)
    const router = useRouter()
    const supabase = createClient()

    const form = useForm<DailyReportFormValues>({
        resolver: zodResolver(dailyReportSchema),
        defaultValues: {
            yesterday_done: [],
            yesterday_carried: [],
            today_plan: "",
            blockers: "",
            sentiment: "green",
        },
    })

    // TODO: Fetch yesterday's plan from Supabase here

    const onSubmit = async (data: DailyReportFormValues) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error("You must be logged in to submit a report.")
                return
            }

            // 1. Create Report
            const { data: report, error: reportError } = await supabase
                .from("reports")
                .insert({
                    user_id: user.id,
                    sentiment: data.sentiment,
                    blockers: data.blockers || null,
                })
                .select()
                .single()

            if (reportError) throw reportError

            // 2. Insert Plan Items (Today's Plan)
            // Split by newlines and filter empty
            const todayItems = data.today_plan.split('\n').filter(line => line.trim() !== "")

            const planInserts = todayItems.map(content => ({
                report_id: report.id,
                content: content.trim(),
                type: "plan_for_tomorrow",
                status: "todo"
            }))

            if (planInserts.length > 0) {
                const { error: planError } = await supabase
                    .from("plan_items")
                    .insert(planInserts)

                if (planError) throw planError
            }

            // 3. Update Yesterday's Items (Actual Done Today)
            // This part requires us to know existing item IDs.
            // For the MVP with MOCK data, we will skip the actual SQL UPDATE for yesterday's items
            // but in a real flow we would update specific rows in 'plan_items' table.

            // For MVP Demo: Record 'actual_done_today' entries based on what they selected from "yesterday"
            // Ideally we update the status of the OLD items.
            // Let's assume we just log them as done for now to show collecting data.

            toast.success("Daily loop completed!")
            router.push("/dashboard")

        } catch (error) {
            console.error("Error submitting report:", error)
            toast.error("Failed to submit report. Please try again.")
        }
    }

    const nextStep = () => setStep(s => Math.min(s + 1, 3))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    return (
        <div className="max-w-lg mx-auto p-4">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Your Status Loop</h1>
                <p className="text-slate-500 mt-1">Step {step} of 3</p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="pt-6">
                            {step === 1 && <RetrospectiveStep form={form} items={MOCK_YESTERDAY_ITEMS} />}
                            {step === 2 && <PlanningStep form={form} />}
                            {step === 3 && <BlockerStep form={form} />}
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-3">
                        {step < 3 ? (
                            <Button type="button" onClick={nextStep} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-12 text-lg">
                                Next
                            </Button>
                        ) : (
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-12 text-lg">
                                Submit Loop
                            </Button>
                        )}

                        {step > 1 && (
                            <Button type="button" variant="ghost" onClick={prevStep} className="w-full text-slate-500 hover:text-slate-900">
                                Back
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    )
}
