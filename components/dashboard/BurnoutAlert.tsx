'use client';

import { useEffect, useState, useCallback } from 'react';
import { checkBurnoutRisk, BurnoutRiskLevel, BurnoutRiskResult as BurnoutRiskResultType } from '@/app/actions/burnout';
import { AlertTriangle, Info, Check } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

interface BurnoutAlertProps {
    userId: string;
    teamId: string;
    riskResult?: BurnoutRiskResultType;
}

// Store the "Noted" timestamp in localStorage.
// Alert reappears when new report data arrives after the noted date.
function getDismissKey(userId: string, teamId: string) {
    return `burnout_noted_${teamId}_${userId}`;
}

function getNotedAt(userId: string, teamId: string): string | null {
    try {
        const stored = localStorage.getItem(getDismissKey(userId, teamId));
        if (!stored) return null;
        return JSON.parse(stored).notedAt || null;
    } catch {
        return null;
    }
}

function isStillDismissed(userId: string, teamId: string, latestReportDate: string): boolean {
    const notedAt = getNotedAt(userId, teamId);
    if (!notedAt) return false;
    // If the latest report is on or before the "noted" date, stay dismissed.
    // If new data came in after noted, show the alert again.
    return latestReportDate <= notedAt.split('T')[0];
}

function dismissAlert(userId: string, teamId: string) {
    try {
        localStorage.setItem(getDismissKey(userId, teamId), JSON.stringify({
            notedAt: new Date().toISOString(),
        }));
    } catch {
        // localStorage unavailable — silently fail
    }
}

export function BurnoutAlert({ userId, teamId, riskResult }: BurnoutAlertProps) {
    const [risk, setRisk] = useState<BurnoutRiskLevel>(riskResult?.riskLevel || 'low');
    const [reasons, setReasons] = useState<string[]>(riskResult?.reasons || []);
    const [label, setLabel] = useState<string>(riskResult?.label || '');
    const [latestReportDate, setLatestReportDate] = useState<string>(riskResult?.latestReportDate || '');
    const [loading, setLoading] = useState(!riskResult);
    const [noted, setNoted] = useState(false);

    useEffect(() => {
        if (riskResult) {
            setRisk(riskResult.riskLevel);
            setReasons(riskResult.reasons);
            setLabel(riskResult.label || '');
            setLatestReportDate(riskResult.latestReportDate || '');
            setLoading(false);
            setNoted(isStillDismissed(userId, teamId, riskResult.latestReportDate || ''));
            return;
        }

        const fetchRisk = async () => {
            try {
                const result = await checkBurnoutRisk(userId, teamId);
                setRisk(result.riskLevel);
                setReasons(result.reasons);
                setLabel(result.label || '');
                setLatestReportDate(result.latestReportDate || '');
                setNoted(isStillDismissed(userId, teamId, result.latestReportDate || ''));
            } catch (error) {
                console.error("Failed to check burnout risk", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRisk();
    }, [userId, teamId, riskResult]);

    const handleNoted = useCallback(() => {
        dismissAlert(userId, teamId);
        setNoted(true);
    }, [userId, teamId]);

    if (loading || risk === 'low' || noted) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`
                        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold cursor-help transition-colors
                        ${risk === 'high'
                            ? 'bg-red-100 text-red-700 hover:bg-red-150'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }
                    `}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{label || (risk === 'high' ? 'Support Opportunity' : 'Check-in Suggested')}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-3 bg-white border border-slate-200 shadow-xl text-slate-700">
                    <p className="font-semibold mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500" />
                        This team member may benefit from a check-in
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                        {reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                        ))}
                    </ul>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] text-slate-400">
                            Based on recent check-in patterns — not a diagnosis.
                        </p>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0 ml-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNoted();
                            }}
                        >
                            <Check className="w-3 h-3 mr-1" />
                            Noted
                        </Button>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
