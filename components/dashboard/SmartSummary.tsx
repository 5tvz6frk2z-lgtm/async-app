'use client';

import { useState } from 'react';
import { generateMorningBriefing } from '@/app/actions/summary';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SmartSummaryProps {
    teamId: string;
}

export function SmartSummary({ teamId }: SmartSummaryProps) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await generateMorningBriefing(teamId);
            if (result.error) {
                // Check if it's a rate limit error
                if (result.error.includes('rate limit') || result.error.includes('429') || result.error.includes('high demand')) {
                    setError('AI feature temporarily unavailable due to high demand. Try again in 1 minute.');
                    toast.error('AI temporarily unavailable. Please try again in 1 minute.');
                } else {
                    setError(result.error);
                    toast.error(result.error);
                }
            } else if (result.summary) {
                setSummary(result.summary);
                toast.success("Briefing generated!");
            }
        } catch (e) {
            setError("An unexpected error occurred.");
            toast.error("Failed to generate summary.");
        } finally {
            setLoading(false);
        }
    };

    if (summary) {
        return (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 mb-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="w-24 h-24 text-indigo-600" />
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-indigo-900">Morning Briefing</h2>
                </div>

                <div className="prose prose-indigo max-w-none text-slate-700">
                    {/* Simple formatting for the raw text response */}
                    {summary.split('\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">{line}</p>
                    ))}
                </div>

                <button
                    onClick={() => setSummary(null)}
                    className="mt-4 text-xs text-indigo-500 hover:text-indigo-700 font-medium underline"
                >
                    Dismiss
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white border boundary-slate-200 rounded-xl p-6 mb-8 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-indigo-50 p-3 rounded-full">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">AI Morning Briefing</h3>
                    <p className="text-sm text-slate-500">Generate a concise summary of your team's latest updates.</p>
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                    </>
                ) : (
                    "Generate Briefing"
                )}
            </button>

            {error && (
                <div className="absolute top-full mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}
        </div>
    );
}
