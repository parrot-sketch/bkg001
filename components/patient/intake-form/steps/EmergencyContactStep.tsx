'use client';

import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmergencyContactStepProps {
  form: UseFormReturn<any>;
}

export function EmergencyContactStep({ form }: EmergencyContactStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Emergency Contact</h2>
        <p className="text-gray-600 mt-1">In case we need to contact someone about your care</p>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="emergencyContactName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} className="h-11" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="emergencyContactNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input placeholder="0712345678" {...field} className="h-11" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergencyContactRelation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SPOUSE">Spouse</SelectItem>
                    <SelectItem value="PARENT">Parent</SelectItem>
                    <SelectItem value="CHILD">Child</SelectItem>
                    <SelectItem value="SIBLING">Sibling</SelectItem>
                    <SelectItem value="FRIEND">Friend</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
        <p className="text-sm text-amber-900">
          ⚠️ Please provide someone who knows your medical situation and can make decisions on your behalf if needed.
        </p>
      </div>
    </div>
  );
}
