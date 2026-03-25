"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronDown, Mail, ArrowRight } from "lucide-react"

const faqs = [
    {
        q: "What is Status Loop?",
        a: "Status Loop is an async reporting tool that replaces daily standups and status meetings. Team members submit a quick end of day report, and managers get an AI-powered morning briefing summarizing everything across their teams.",
    },
    {
        q: "How long does it take to set up?",
        a: "Less than 5 minutes. Create a team, invite your members via email, and you're ready to go. No integrations required to get started.",
    },
    {
        q: "What does an end of day report include?",
        a: "Each report covers three things: what you accomplished today, what you plan to do tomorrow, and any blockers. There's also an optional sentiment check. The whole thing takes under 2 minutes.",
    },
    {
        q: "How does the AI Morning Briefing work?",
        a: "Overnight, Status Loop's AI reads every team member's report and generates a single, concise summary. You wake up knowing exactly what happened yesterday across all your teams — without reading each report individually.",
    },
    {
        q: "Can I manage multiple teams?",
        a: "Yes. You can create separate teams for different projects, locations, or departments and view them all from a single dashboard.",
    },

    {
        q: "What if my team forgets to submit their report?",
        a: "Status Loop tracks participation rates and can send reminders. The Team Pulse dashboard shows you who submitted and who didn't at a glance.",
    },
    {
        q: "How is burnout detection handled?",
        a: "Status Loop monitors sentiment patterns and blocker frequency. If a team member shows signs of sustained low mood or repeated blockers, the system flags it so managers can check in proactively.",
    },
]

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="border-b border-slate-200">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between py-5 text-left group"
            >
                <span className="text-lg font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">{q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <p className="pb-5 text-slate-600 leading-relaxed">{a}</p>
            )}
        </div>
    )
}

export default function HelpPage() {
    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="pt-32 pb-16 bg-gradient-to-b from-indigo-50/50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Help Center</h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        Answers to common questions about Status Loop.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
                <div>
                    {faqs.map((faq) => (
                        <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                    ))}
                </div>
            </section>

            {/* Contact */}
            <section className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Mail className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Still have questions?</h2>
                    <p className="text-slate-600 mb-8">
                        Our team typically responds within a few hours during business days.
                    </p>
                    <Link href="mailto:support@statusloop.com">
                        <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                            Email Support
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </section>
        </div>
    )
}
