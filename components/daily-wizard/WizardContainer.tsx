"use client"

import { useState, useEffect } from "react"
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
import { Loader2, X, ChevronRight, ChevronLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface YesterdayItem {
    id: string
    content: string
}

export function WizardContainer() {
    const [step, setStep] = useState(1)
    const [yesterdayItems, setYesterdayItems] = useState<YesterdayItem[]>([])
    const [isLoadingItems, setIsLoadingItems] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    const form = useForm<DailyReportFormValues>({
        resolver: zodResolver(dailyReportSchema),
        defaultValues: {
            yesterday_done: [],
            yesterday_carried: [],
            today_completed: [],
            today_plan: "",
            blockers: "",
            sentiment: "green",
        },
    })

    // Fetch yesterday's plan from Supabase
    useEffect(() => {
        const fetchYesterdayPlan = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setIsLoadingItems(false)
                    return
                }

                const { data: memberships } = await supabase
                    .from('team_members')
                    .select('team_id')
                    .eq('user_id', user.id)
                    .limit(1)

                const teamId = memberships?.[0]?.team_id
                if (!teamId) {
                    setIsLoadingItems(false)
                    return
                }

                const { data: recentReport } = await supabase
                    .from('reports')
                    .select('id, date')
                    .eq('user_id', user.id)
                    .eq('team_id', teamId)
                    .lt('date', new Date().toISOString().split('T')[0])
                    .order('date', { ascending: false })
                    .limit(1)
                    .single()

                if (recentReport) {
                    const { data: planItems } = await supabase
                        .from('plan_items')
                        .select('id, content')
                        .eq('report_id', recentReport.id)
                        .eq('type', 'plan_for_tomorrow')

                    if (planItems && planItems.length > 0) {
                        setYesterdayItems(planItems)
                    }
                }
            } catch (error) {
                console.error('Error fetching yesterday plan:', error)
            } finally {
                setIsLoadingItems(false)
            }
        }

        fetchYesterdayPlan()
    }, [])


    const onSubmit = async (data: DailyReportFormValues) => {
        // Guard: Prevent submission if not on final step
        if (step !== 3) return

        try {
            const { data: { user } } = await supabase.auth.getUser()
            // ... (rest of function logic is fine, but I need to include it or just replacing the start)
            // I'll replace the whole function in a moment or just use the diff carefully.
            // Actually, I'll replacements chunks.
            // First chunk: Add guard.
            // Second chunk: Button Refactor.
            // ...
            // Wait, I can't do multiple chunks easily if I want to just edit the button area and the submit function storage.
            // I'll do one large replace or multiple small ones.
            // I'll do multiple small ones.

            // Chunk 1: Add guard to onSubmit start.
            // Chunk 2: Replace the button logic.


            if (!user) {
                toast.error("You must be logged in to submit a report.")
                return
            }

            const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1)
            const teamId = memberships?.[0]?.team_id

            if (!teamId) {
                toast.error("You are not part of any team.")
                router.push("/onboarding")
                return
            }

            const { data: report, error: reportError } = await supabase
                .from("reports")
                .upsert({
                    team_id: teamId,
                    user_id: user.id,
                    date: new Date().toISOString().split('T')[0],
                    sentiment: data.sentiment,
                    blockers: data.blockers?.trim() || null,
                }, { onConflict: 'team_id, user_id, date' })
                .select()
                .single()

            if (reportError) throw reportError

            const { error: deleteError } = await supabase
                .from("plan_items")
                .delete()
                .eq("report_id", report.id)

            if (deleteError) throw deleteError

            const tomorrowItems = data.today_plan.split('\n')
                .filter(line => line.trim() !== "")
                .map(content => ({
                    report_id: report.id,
                    content: content.trim(),
                    type: "plan_for_tomorrow",
                    status: "todo"
                }))

            const completedItems = (data.today_completed || [])
                .map(content => ({
                    report_id: report.id,
                    content: content.trim(),
                    type: "actual_done_today",
                    status: "done"
                }))

            const allItems = [...tomorrowItems, ...completedItems]

            if (allItems.length > 0) {
                const { error: planError } = await supabase
                    .from("plan_items")
                    .insert(allItems)

                if (planError) throw planError
            }

            toast.success("Daily loop completed!")
            router.push("/dashboard/member")
            router.refresh()

        } catch (error: any) {
            console.error("Error submitting report:", error)
            toast.error(error.message || "Failed to submit report. Please try again.")
        }
    }

    const nextStep = async () => {
        if (step === 2) {
            const valid = await form.trigger("today_plan")
            if (!valid) return
        }
        setStep(s => Math.min(s + 1, 3))
    }
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    const isSubmitting = form.formState.isSubmitting

    return (
        <div className="w-full max-w-2xl mx-auto p-4 md:p-8">
            <div className="mb-8 relative text-center">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                    onClick={() => router.push('/dashboard')}
                    title="Exit to Dashboard"
                >
                    <X className="w-5 h-5" />
                </Button>

                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Status Loop</h1>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mt-4">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`h-1.5 w-12 rounded-full transition-all duration-500 ${s === step ? 'bg-indigo-600 w-16' :
                                s < step ? 'bg-indigo-200' : 'bg-slate-200'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={(e) => { if (e.key === 'Enter' && step < 3) e.preventDefault() }}>
                    <div className="relative min-h-[400px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="w-full"
                            >
                                <Card className="bg-white border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                                    <CardContent className="pt-8 pb-8 px-8 md:px-10">
                                        {step === 1 && (
                                            isLoadingItems ? (
                                                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
                                                    <span className="text-lg font-medium">Loading history...</span>
                                                </div>
                                            ) : (
                                                <RetrospectiveStep form={form} items={yesterdayItems} />
                                            )
                                        )}
                                        {step === 2 && <PlanningStep form={form} />}
                                        {step === 3 && <BlockerStep form={form} />}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex flex-col gap-3 mt-8 max-w-sm mx-auto">
                        {step === 3 ? (
                            <Button
                                key="submit-btn"
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 text-white rounded-full h-14 text-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</>
                                ) : (
                                    "Complete Check-in"
                                )}
                            </Button>
                        ) : (
                            <Button
                                key="next-btn"
                                type="button"
                                onClick={nextStep}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-full h-14 text-lg font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span className="flex items-center">Next <ChevronRight className="ml-1 w-5 h-5" /></span>
                            </Button>
                        )}

                        {step > 1 && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={prevStep}
                                className="w-full text-slate-400 hover:text-slate-600 rounded-full h-12"
                            >
                                <ChevronLeft className="mr-1 w-4 h-4" /> Back
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </div>
    )
}
