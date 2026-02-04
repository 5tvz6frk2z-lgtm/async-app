import { WizardContainer } from "@/components/daily-wizard/WizardContainer"

export default function DailyPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <WizardContainer />
            </div>
        </div>
    )
}
