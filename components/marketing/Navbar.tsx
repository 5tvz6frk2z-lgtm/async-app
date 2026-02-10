"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                                Status Loop
                            </span>
                        </Link>
                        <div className="hidden md:flex ml-10 space-x-8">
                            <Link href="/#features" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Product</Link>
                            <Link href="/pricing" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Pricing</Link>
                            <Link href="/resources" className="text-slate-600 hover:text-indigo-600 font-medium transition-colors">Resources</Link>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" className="text-slate-700 hover:text-indigo-600">Log in</Button>
                        </Link>
                        <Link href="/pricing">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
