'use client';

import { Card } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export function SuccessScreen() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Card className="bg-white border-0 shadow-lg p-8 text-center max-w-md">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        
        <p className="text-gray-600 mb-6">
          Your intake form has been received successfully. Our team will review your information and be in touch shortly to confirm your appointment.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-900">
            ✓ Your information is secure and confidential
          </p>
          <p className="text-sm text-green-900 mt-2">
            ✓ Check your email for further instructions
          </p>
        </div>
      </Card>
    </div>
  );
}
