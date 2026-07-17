'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface SuccessScreenProps {
  fileNumber?: string;
  firstName?: string;
}

export function SuccessScreen({ fileNumber, firstName }: SuccessScreenProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="bg-white border-0 shadow-lg p-8 text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {firstName ? `You're all set, ${firstName}!` : "You're all set!"}
        </h2>
        
        <p className="text-gray-600 mb-6">
          Your details have been received. Please take a seat — we'll call your name shortly.
        </p>

        {fileNumber && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-900">
              Your file number is <span className="font-mono font-bold text-base">{fileNumber}</span>
            </p>
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-900">
            Your information is secure and confidential
          </p>
        </div>
      </Card>
    </div>
  );
}
