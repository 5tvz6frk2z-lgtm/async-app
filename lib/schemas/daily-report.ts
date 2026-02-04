import { z } from "zod"

export const dailyReportSchema = z.object({
    yesterday_done: z.array(z.string()), // IDs of items marked as done
    yesterday_carried: z.array(z.string()), // IDs of items carried over
    today_plan: z.string().min(1, "Please add at least one item for today."),
    blockers: z.string().optional(),
    sentiment: z.enum(["green", "yellow", "red"]),
})

export type DailyReportFormValues = z.infer<typeof dailyReportSchema>
