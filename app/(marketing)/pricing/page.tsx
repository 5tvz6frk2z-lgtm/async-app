"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Check } from "lucide-react"

export default function PricingPage() {
    return (
        <div className="py-24 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Simple pricing for teams of all sizes</h1>
                <p className="text-xl text-slate-600 mb-16">Start for free, upgrade as you grow.</p>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Tier */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Starter</h3>
                        <div className="text-4xl font-bold text-slate-900 mb-6">$4<span className="text-lg font-normal text-slate-500">/user/mo</span></div>
                        <p className="text-slate-600 mb-6">Perfect for small project teams.</p>
                        <Link href="/signup" className="w-full mb-8">
                            <Button variant="outline" className="w-full">Start Free Trial</Button>
                        </Link>
                        <ul className="text-left space-y-4">
                            <li className="flex gap-3 text-sm text-slate-700">
                                <Check className="w-5 h-5 text-emerald-500" /> Unlimited team members
                            </li>
                            <li className="flex gap-3 text-sm text-slate-700">
                                <Check className="w-5 h-5 text-emerald-500" /> Daily check-ins
                            </li>
                            <li className="flex gap-3 text-sm text-slate-700">
                                <Check className="w-5 h-5 text-emerald-500" /> 1 month history
                            </li>
                        </ul>
                    </div>

                    {/* Pro Tier */}
                    <div className="bg-slate-900 p-8 rounded-2xl border border-indigo-500 shadow-xl relative scale-105">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            Most Popular
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                        <div className="text-4xl font-bold text-white mb-6">$12<span className="text-lg font-normal text-slate-400">/user/mo</span></div>
                        <p className="text-slate-300 mb-6">For growing engineering teams.</p>
                        <Link href="/signup" className="w-full mb-8">
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 border-none">Start Free Trial</Button>
                        </Link>
                        <ul className="text-left space-y-4">
                            <li className="flex gap-3 text-sm text-slate-200">
                                <Check className="w-5 h-5 text-indigo-400" /> Unlimited team members
                            </li>
                            <li className="flex gap-3 text-sm text-slate-200">
                                <Check className="w-5 h-5 text-indigo-400" /> Weekly AI Rollups
                            </li>
                            <li className="flex gap-3 text-sm text-slate-200">
                                <Check className="w-5 h-5 text-indigo-400" /> Manager Interventions
                            </li>
                            <li className="flex gap-3 text-sm text-slate-200">
                                <Check className="w-5 h-5 text-indigo-400" /> Unlimited history
                            </li>
                        </ul>
                    </div>


                </div>
            </div>
        </div>
    )
}
