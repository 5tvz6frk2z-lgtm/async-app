import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"

interface Report {
    date: string
    sentiment: "green" | "yellow" | "red"
}

interface SentimentPulseProps {
    reports: Report[]
}

export function SentimentPulse({ reports }: SentimentPulseProps) {
    // Get last 7 days of reports, padded with empty days if needed for visual consistency?
    // For now, let's just show the actual last 7 user reports to keep it dense.
    const recentReports = reports.slice(0, 14).reverse() // Show last 14 days/reports

    const getColor = (sentiment: string) => {
        switch (sentiment) {
            case "green": return "bg-green-500"
            case "yellow": return "bg-yellow-400"
            case "red": return "bg-red-500"
            default: return "bg-slate-200"
        }
    }

    const getHeight = (sentiment: string) => {
        switch (sentiment) {
            case "green": return "h-8" // High bar
            case "yellow": return "h-6" // Medium bar
            case "red": return "h-4" // Low bar
            default: return "h-2"
        }
    }

    return (
        <div className="flex items-end gap-1.5 h-10">
            <TooltipProvider delayDuration={100}>
                {recentReports.map((report, i) => (
                    <Tooltip key={i}>
                        <TooltipTrigger asChild>
                            <div
                                className={`w-3 rounded-t-sm cursor-help transition-all hover:opacity-80 ${getColor(report.sentiment)} ${getHeight(report.sentiment)}`}
                            />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-xs font-semibold">{format(new Date(report.date), "MMM d")}</p>
                            <p className="text-xs capitalize">{report.sentiment}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </TooltipProvider>
            {recentReports.length === 0 && (
                <div className="text-xs text-slate-400 italic">No sentiment history yet</div>
            )}
        </div>
    )
}
