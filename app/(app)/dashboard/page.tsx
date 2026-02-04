import { Timeline } from "@/components/dashboard/Timeline"
import { AnalyticsSummary } from "@/components/dashboard/AnalyticsSummary"

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <AnalyticsSummary />
            <Timeline />
        </div>
    )
}
