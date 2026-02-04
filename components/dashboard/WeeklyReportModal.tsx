"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export function WeeklyReportModal() {
    const mockSummary = [
        {
            user: "Alice",
            completed: ["Fixed login bug", "Implemented hero section", "Setup analytics"],
            carried: ["Optimize images"],
            blockers: "Design assets received late",
            sentiment: "green"
        },
        {
            user: "Bob",
            completed: ["Database schema", "Auth setup", "API Routes"],
            carried: [],
            blockers: null,
            sentiment: "green"
        },
        {
            user: "Charlie",
            completed: [],
            carried: ["payment gateways (Research)"],
            blockers: "API Key pending",
            sentiment: "yellow"
        }
    ]

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                    Generate Weekly Roll-up
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Weekly Team Roll-up</DialogTitle>
                    <DialogDescription>
                        Summary of team activity and progress for the week ending {new Date().toLocaleDateString()}.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px] mt-4 pr-4">
                    <div className="space-y-6">
                        {mockSummary.map((report, idx) => (
                            <div key={idx} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold text-slate-900">{report.user}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${report.sentiment === 'green' ? 'bg-emerald-100 text-emerald-700' :
                                            report.sentiment === 'yellow' ? 'bg-amber-100 text-amber-700' :
                                                'bg-rose-100 text-rose-700'
                                        }`}>
                                        {report.sentiment.toUpperCase()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <h4 className="text-slate-500 text-xs uppercase font-medium mb-1">Completed</h4>
                                        {report.completed.length > 0 ? (
                                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                                                {report.completed.map((item, i) => <li key={i}>{item}</li>)}
                                            </ul>
                                        ) : <span className="text-slate-400 italic">No items completed</span>}
                                    </div>
                                    <div>
                                        <h4 className="text-slate-500 text-xs uppercase font-medium mb-1">Carried Over / Blockers</h4>
                                        {report.blockers && (
                                            <p className="text-rose-600 font-medium mb-2">⚠️ {report.blockers}</p>
                                        )}
                                        {report.carried.length > 0 ? (
                                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                                                {report.carried.map((item, i) => <li key={i}>{item}</li>)}
                                            </ul>
                                        ) : !report.blockers && <span className="text-slate-400 italic">None</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline">Export as PDF</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Share with Stakeholders</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
