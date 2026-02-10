"use client"

import { UseFormReturn } from "react-hook-form"
import { DailyReportFormValues } from "@/lib/schemas/daily-report"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface BlockerStepProps {
    form: UseFormReturn<DailyReportFormValues>
}

export function BlockerStep({ form }: BlockerStepProps) {
    return (
        <div className="space-y-8">
            {/* Blockers Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h2 className="text-lg font-medium text-slate-900">Blockers</h2>
                    <p className="text-slate-500 text-sm">Any impediments to your progress? (Optional)</p>
                </div>
                <FormField
                    control={form.control}
                    name="blockers"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea
                                    placeholder="I'm waiting on..."
                                    className="min-h-[100px] border-slate-200 focus:ring-rose-100 focus:border-rose-300 resize-none"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Sentiment Section */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h2 className="text-lg font-medium text-slate-900">Sentiment Check</h2>
                    <p className="text-slate-500 text-sm">How are you feeling about completing your taskload?</p>
                </div>

                <FormField
                    control={form.control}
                    name="sentiment"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-3 gap-4"
                                >
                                    {/* Green */}
                                    <div>
                                        <RadioGroupItem value="green" id="green" className="peer sr-only" />
                                        <Label
                                            htmlFor="green"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 [&:has([data-state=checked])]:border-emerald-500 cursor-pointer"
                                        >
                                            <span className="text-2xl mb-2">🟢</span>
                                            <span className="text-xs font-medium text-slate-600">On Track</span>
                                        </Label>
                                    </div>

                                    {/* Yellow */}
                                    <div>
                                        <RadioGroupItem value="yellow" id="yellow" className="peer sr-only" />
                                        <Label
                                            htmlFor="yellow"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-yellow-500 peer-data-[state=checked]:bg-yellow-50 [&:has([data-state=checked])]:border-yellow-500 cursor-pointer"
                                        >
                                            <span className="text-2xl mb-2">🟡</span>
                                            <span className="text-xs font-medium text-slate-600">Caution</span>
                                        </Label>
                                    </div>

                                    {/* Red */}
                                    <div>
                                        <RadioGroupItem value="red" id="red" className="peer sr-only" />
                                        <Label
                                            htmlFor="red"
                                            className="flex flex-col items-center justify-between rounded-md border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:text-rose-600 peer-data-[state=checked]:bg-rose-50 [&:has([data-state=checked])]:border-rose-500 cursor-pointer"
                                        >
                                            <span className="text-2xl mb-2">🔴</span>
                                            <span className="text-xs font-medium text-slate-600">Behind</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    )
}
