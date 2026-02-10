'use client';

import { useEffect, useState } from 'react';
import { checkBurnoutRisk, BurnoutRiskLevel, BurnoutRiskResult as BurnoutRiskResultType } from '@/app/actions/burnout';
import { AlertTriangle, Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface BurnoutAlertProps {
    userId: string;
    teamId: string;
    riskResult?: { riskLevel: BurnoutRiskLevel; reasons: string[] };
}

export function BurnoutAlert({ userId, teamId, riskResult }: BurnoutAlertProps) {
    const [risk, setRisk] = useState<BurnoutRiskLevel>(riskResult?.riskLevel || 'low');
    const [reasons, setReasons] = useState<string[]>(riskResult?.reasons || []);
    const [loading, setLoading] = useState(!riskResult);

    useEffect(() => {
        if (riskResult) {
            setRisk(riskResult.riskLevel);
            setReasons(riskResult.reasons);
            setLoading(false);
            return;
        }

        const fetchRisk = async () => {
            try {
                const result = await checkBurnoutRisk(userId, teamId);
                setRisk(result.riskLevel);
                setReasons(result.reasons);
            } catch (error) {
                console.error("Failed to check burnout risk", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRisk();
    }, [userId, teamId, riskResult]);

    if (loading || risk === 'low') return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`
            flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold cursor-help
            ${risk === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
          `}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{risk === 'high' ? 'High Risk' : 'Risk'}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 bg-white border border-slate-200 shadow-xl text-slate-700">
                    <p className="font-semibold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500" />
                        Potential Burnout Detected
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                        {reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                        ))}
                    </ul>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
