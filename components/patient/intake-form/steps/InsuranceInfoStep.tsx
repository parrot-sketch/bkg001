'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface InsuranceInfoStepProps {
  form: UseFormReturn<any>;
}

export function InsuranceInfoStep({ form }: InsuranceInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Insurance Information</h2>
        <p className="text-gray-600 mt-1">This helps us process your claims and billing (Optional)</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="insuranceProvider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insurance Provider (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Britam, NHIF" {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="insuranceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Policy/Member Number (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Your policy number" {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-green-900">
          💳 Having insurance information ready makes billing easier for everyone.
        </p>
      </div>
    </div>
  );
}
