import { z } from "zod"

export const dailyReportSchema = z.object({
    yesterday_done: z.array(z.string()), // IDs of items marked as done
    yesterday_carried: z.array(z.string()), // IDs of items carried over
    today_completed: z.array(z.string()), // Text content of DONE items (including unplanned)
    today_plan: z.string().superRefine((val, ctx) => {
        const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0)
        if (lines.length < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Please add at least one task for tomorrow."
            })
        }
    }),
    blockers: z.string().optional(),
    sentiment: z.enum(["green", "yellow", "red"]),
})

export type DailyReportFormValues = z.infer<typeof dailyReportSchema>
