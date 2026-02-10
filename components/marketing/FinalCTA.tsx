"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Sparkles } from "lucide-react"

export function FinalCTA() {
    return (
        <section className="py-24 relative overflow-hidden bg-slate-50">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50 to-white" />
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl animate-pulse pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-100/50 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none" />

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6 border border-indigo-200">
                    <Sparkles className="w-4 h-4" />
                    <span>The Future of Work</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-indigo-950 mb-6">
                    This isn't your average <br />
                    <span className="text-indigo-600 font-extrabold block mt-2 drop-shadow-sm">
                        End of Day Report.
                    </span>
                </h2>

                <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                    This is <strong className="text-indigo-900">AI-powered asynchronous management</strong>.
                    <br className="hidden md:block" />
                    This is <strong>Status Loop AI</strong>.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link href="/signup">
                        <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all hover:scale-105 font-bold">
                            Get Started for Free
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    )
}
