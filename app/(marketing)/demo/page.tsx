
"use client"
import Link from 'next/link'

export default function DemoPage() {
    return (
        <div className="py-24 bg-slate-50 min-h-screen flex flex-col items-center">
            <div className="max-w-4xl w-full px-4 sm:px-6 lg:px-8 text-center">
                <span className="text-4xl mb-4 block">📺</span>
                <h1 className="text-4xl font-extrabold text-slate-900 mb-6">See Status Loop in Action</h1>
                <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
                    Watch how top engineering teams automate their standups and reclaim focus time.
                </p>

                {/* Video Placeholder */}
                <div className="relative aspect-video bg-slate-900 rounded-2xl shadow-2xl overflow-hidden mb-12 border border-slate-200 group cursor-pointer">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-2"></div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-left">
                        <p className="text-white font-semibold">Product Walkthrough (2:45)</p>
                    </div>
                </div>

                {/* Booking Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Want a personalized tour?</h2>
                    <p className="text-slate-600 mb-8">
                        Our product experts can show you exactly how Status Loop fits into your specific workflow.
                    </p>
                    <button className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-indigo-700 transition duration-200 w-full sm:w-auto">
                        Book a Live Demo
                    </button>
                    <p className="text-sm text-slate-500 mt-4">
                        No credit card required.
                    </p>
                </div>
            </div>
        </div>
    )
}
