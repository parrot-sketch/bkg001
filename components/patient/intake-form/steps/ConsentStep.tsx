'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormControl, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ConsentStepProps {
  form: UseFormReturn<any>;
}

export function ConsentStep({ form }: ConsentStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Consent & Agreements</h2>
        <p className="text-gray-600 mt-1">Please review and agree to proceed</p>
      </div>

      <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <FormField
          control={form.control}
          name="privacyConsent"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              </FormControl>
              <div className="flex-1">
                <FormLabel className="text-base font-medium cursor-pointer">
                  Privacy Policy *
                </FormLabel>
                <p className="text-sm text-gray-600 mt-1">
                  I agree that my personal information can be processed according to the privacy policy. My data will be encrypted and stored securely.
                </p>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="serviceConsent"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0 pt-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              </FormControl>
              <div className="flex-1">
                <FormLabel className="text-base font-medium cursor-pointer">
                  Service Agreement *
                </FormLabel>
                <p className="text-sm text-gray-600 mt-1">
                  I agree to the terms of service and understand that I am responsible for the accuracy of the information provided.
                </p>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="medicalConsent"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-3 space-y-0 pt-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              </FormControl>
              <div className="flex-1">
                <FormLabel className="text-base font-medium cursor-pointer">
                  Medical Treatment Consent *
                </FormLabel>
                <p className="text-sm text-gray-600 mt-1">
                  I authorize medical professionals to examine and treat me based on the information I have provided.
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          All three agreements are required before you can submit your intake form.
        </AlertDescription>
      </Alert>
    </div>
  );
}
