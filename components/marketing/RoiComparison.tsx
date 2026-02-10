"use client"

import { Clock, Zap } from "lucide-react"

export function RoiComparison() {
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Text Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-sm font-medium mb-6">
                            <Zap className="w-4 h-4" />
                            <span>Instant ROI</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                            Spend <span className="text-emerald-600">2 minutes</span> <br />
                            to save <span className="text-rose-600">60 minutes</span>.
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                            Traditional standups are expensive. Between the 15-minute meeting and the 45-minute context switching cost, you're losing over an hour per developer, every single day.
                        </p>
                        <p className="text-lg text-slate-600 mb-8 font-medium">
                            Status Loop gives you that time back.
                        </p>

                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 border-l-4 border-l-indigo-500">
                            <p className="text-slate-800 italic">
                                "It used to take us an hour to get started. Now we're coding by 9:05 AM."
                            </p>
                            <p className="mt-4 text-sm font-bold text-indigo-900">— Sarah J., Engineering Lead</p>
                        </div>
                    </div>

                    {/* Graphic */}
                    <div className="relative">
                        {/* Background Blob */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-indigo-50 rounded-full blur-3xl opacity-50 z-0"></div>

                        <div className="relative z-10 bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-8 text-center">Daily Time Cost Per Developer</h3>

                            {/* Bar 1: Traditional */}
                            <div className="mb-8 group">
                                <div className="flex justify-between text-sm mb-2 font-medium">
                                    <span className="text-slate-600 group-hover:text-rose-600 transition-colors">Traditional Standup</span>
                                    <span className="text-rose-600">60 mins</span>
                                </div>
                                <div className="h-12 w-full bg-slate-100 rounded-lg flex overflow-hidden relative">
                                    {/* Meeting */}
                                    <div className="h-full bg-rose-400 w-[25%] flex items-center justify-center text-[10px] text-white font-bold tracking-wider">
                                        MEETING
                                    </div>
                                    {/* Context Switch */}
                                    <div className="h-full bg-rose-200 w-[75%] flex items-center justify-center text-[10px] text-rose-800 font-bold tracking-wider opacity-80 group-hover:opacity-100 transition-opacity">
                                        CONTEXT SWITCHING
                                    </div>
                                </div>
                            </div>

                            {/* Bar 2: Status Loop */}
                            <div className="mb-2 group">
                                <div className="flex justify-between text-sm mb-2 font-medium">
                                    <span className="text-slate-600 group-hover:text-emerald-600 transition-colors">Status Loop</span>
                                    <span className="text-emerald-600">2 mins</span>
                                </div>
                                <div className="h-12 w-full bg-slate-100 rounded-lg overflow-hidden relative flex items-center">
                                    <div className="h-full bg-emerald-500 w-[5%] rounded-lg shadow-sm shadow-emerald-200 group-hover:shadow-md transition-all"></div>
                                    <span className="ml-3 text-xs text-slate-400">Writing Update</span>
                                </div>
                            </div>

                            {/* Comparison Badge */}
                            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                                <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold">
                                    30x More Efficient
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
