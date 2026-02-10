"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="text-center space-y-4">
                <h1 className="text-6xl font-bold text-slate-200">404</h1>
                <h2 className="text-2xl font-bold text-slate-900">Page not found</h2>
                <p className="text-slate-500 max-w-sm mx-auto">
                    The page you are looking for doesn't exist or has been moved.
                </p>
                <Link href="/">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Return Home
                    </Button>
                </Link>
            </div>
        </div>
    )
}
