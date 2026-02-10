

import { Navbar } from "@/components/marketing/Navbar"
import Link from "next/link"

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <Navbar />
            <main className="flex-1">
                {children}
            </main>

            <footer className="bg-slate-900 text-slate-400 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-white font-bold mb-4">Status Loop</h3>
                        <p className="text-sm">Async updates for modern teams.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-200 mb-3">Product</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="/enterprise" className="hover:text-white transition-colors">Enterprise</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-200 mb-3">Resources</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                            <li><Link href="/guides" className="hover:text-white transition-colors">Guides</Link></li>
                            <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-200 mb-3">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                        </ul>
                    </div>
                </div>
            </footer>
        </div>
    )
}
