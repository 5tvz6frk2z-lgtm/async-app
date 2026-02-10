"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                    <div className="text-center space-y-4 max-w-md">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Something went wrong!</h2>
                        <p className="text-slate-500">
                            We apologize for the inconvenience. An unexpected error occurred.
                        </p>
                        <Button
                            onClick={() => reset()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Try again
                        </Button>
                    </div>
                </div>
            </body>
        </html>
    )
}
