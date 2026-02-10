"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function Hero() {
    return (
        <section className="relative pt-32 pb-20 overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-white -z-10" />
            <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl -z-10 animate-pulse" />
            <div className="absolute top-40 left-0 w-[400px] h-[400px] bg-indigo-200/30 rounded-full blur-3xl -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-8 border border-indigo-100">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    New: AI-Powered Weekly Rollups
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6">
                    Stop chasing status updates. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        Start closing loops.
                    </span>
                </h1>

                <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-10 leading-relaxed">
                    Status Loop automates your team's daily standups and weekly reporting.
                    Keep everyone in sync without the 9:00 AM meeting fatigue.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                    <Link href="/pricing">
                        <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200">
                            View Plans
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                    <Link href="#demo">
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-200 hover:bg-slate-50">
                            View Demo
                        </Button>
                    </Link>
                </div>

                {/* Hero Visual */}
                <div className="relative mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden aspect-[16/9]">
                    <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                        <p className="text-slate-400 font-medium">Product Demo Animation / Screenshot would go here</p>
                        {/* Placeholder for actual product screenshot */}
                    </div>
                </div>
            </div>
        </section>
    )
}
