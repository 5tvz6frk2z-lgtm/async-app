import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AnalyticsSummary() {
    // Mock Data
    const sayDoRatio = 82
    const trend = "+5%"

    return (
        <div className="grid grid-cols-2 gap-4 mb-8 max-w-2xl mx-auto">
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                        Say-Do Ratio
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{sayDoRatio}%</div>
                    <p className="text-xs text-emerald-600 mt-1">{trend} from last week</p>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                        Team Pulse
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">Health: Good</div>
                    <p className="text-xs text-slate-400 mt-1">2 blockers reported today</p>
                </CardContent>
            </Card>
        </div>
    )
}
