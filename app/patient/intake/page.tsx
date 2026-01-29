'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PatientIntakeFormRefactored } from '@/components/patient/intake-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Lock } from 'lucide-react';

function PatientIntakePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-2xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Invalid Session</AlertTitle>
            <AlertDescription>
              No valid session found. Please scan the QR code provided by the receptionist or ask them to start a new intake session.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">Private & Secure</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Intake Form</h1>
          <p className="text-gray-600">
            Please complete this form privately. Your information is secure and confidential.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-8">
        <PatientIntakeFormRefactored
          sessionId={sessionId}
          onSuccess={() => {
            // Redirect after 3 seconds to success message
            setTimeout(() => {
              router.replace('/patient/intake/success');
            }, 3000);
          }}
        />
      </div>

      {/* Privacy Footer */}
      <div className="bg-gray-50 border-t border-gray-200">
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

export default function PatientIntakePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientIntakePageContent />
    </Suspense>
  );
}
