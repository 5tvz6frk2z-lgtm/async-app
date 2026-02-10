"use client"

export default function ResourcesPage() {
    return (
        <div className="py-24 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl font-bold text-slate-900 mb-8">Resources & Guides</h1>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Blog Card 1 */}
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="h-48 bg-slate-200" />
                        <div className="p-6">
                            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Guide</span>
                            <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-indigo-600 transition-colors">How to run efficient async standups</h3>
                            <p className="text-slate-600 mt-2 text-sm line-clamp-3">
                                Running standups asynchronously can save your team hours every week. Learn the best practices...
                            </p>
                        </div>
                    </div>

                    {/* Blog Card 2 */}
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="h-48 bg-slate-200" />
                        <div className="p-6">
                            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Case Study</span>
                            <h3 className="text-lg font-bold text-slate-900 mt-2 group-hover:text-indigo-600 transition-colors">How Acme Corp reduced meetings by 40%</h3>
                            <p className="text-slate-600 mt-2 text-sm line-clamp-3">
                                See how a team of 50 engineers switched to Status Loop and improved their dORA metrics...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
