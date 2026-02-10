"use client";

import { useEffect, useState } from "react";
import { DailyReportTemplate } from "./DailyReportTemplate";
import { getLatestDailyReport } from "@/app/(app)/dashboard/actions";
import { Loader2 } from "lucide-react";

export function DailyReportView({ teamId }: { teamId: string }) {
    const [data, setData] = useState<any>(null);
    const [teamName, setTeamName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!teamId) return;
        setLoading(true);
        getLatestDailyReport(teamId)
            .then(res => {
                setData(res.data);
                setTeamName(res.teamName);
            })
            .catch(err => {
                setError("Failed to load daily report");
                console.error(err);
            })
            .finally(() => setLoading(false));
    }, [teamId]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>;
    if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
    if (!data) return <div className="p-10 text-center text-slate-500">No report data available for today.</div>;

    return <DailyReportTemplate data={data} teamName={teamName} />;
}
