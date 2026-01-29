import { SuccessScreen } from '@/components/patient/intake-form/ui/SuccessScreen';
import { Lock } from 'lucide-react';

export default function IntakeSuccessPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 mb-8">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Private & Secure</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Intake Form</h1>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
                <SuccessScreen />
            </div>

            {/* Privacy Footer */}
            <div className="mt-8">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <p className="text-xs text-gray-600 text-center">
                        Your information is encrypted and stored securely. Only authorized medical staff can access your data.
                        Your privacy is our priority.
                    </p>
                </div>
            </div>
        </div>
    );
}
