'use client';

/**
 * Client Profile Page
 * 
 * Progressive identity building for authenticated users (not medical intake).
 * This is NOT a medical form - just basic profile information.
 * 
 * Purpose: Help personalize experience before user becomes a patient.
 * 
 * Key Principles:
 * - Optional fields only
 * - No clinical questions
 * - Autosave where possible
 * - Low pressure, skippable
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/patient/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
  });

  // Load existing user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        gender: '',
        dateOfBirth: '',
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/patient/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement profile update API call
      // For now, just show success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Optional: Autosave after delay
    // Could implement debounced save here
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mb-3">
          Complete Your Profile
        </h1>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
          Help us personalize your experience. All fields are optional and can be updated anytime.
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium text-slate-900">
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => handleFieldChange('firstName', e.target.value)}
              disabled={isSubmitting}
              className="h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium text-slate-900">
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => handleFieldChange('lastName', e.target.value)}
              disabled={isSubmitting}
              className="h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-slate-900">
            Phone Number <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+254 700 000 000"
            value={formData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            disabled={isSubmitting}
            className="h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll use this to send appointment reminders and updates
          </p>
        </div>

        {/* Gender - Optional */}
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-sm font-medium text-slate-900">
            Gender <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => handleFieldChange('gender', e.target.value)}
            disabled={isSubmitting}
            className="w-full h-11 px-3 bg-transparent border border-gray-300 rounded-md focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors text-slate-900"
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </div>

        {/* Date of Birth - Optional */}
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-900">
            Date of Birth <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
            disabled={isSubmitting}
            max={new Date().toISOString().split('T')[0]}
            className="h-11 bg-transparent border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
          <Button
            type="submit"
            className="flex-1 sm:flex-initial h-11 bg-teal-500 hover:bg-teal-600 text-white font-medium transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Profile'
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/portal/welcome')}
            className="flex-1 sm:flex-initial h-11 border-gray-300 text-slate-900 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Skip for Now
          </Button>
        </div>
      </form>

      {/* Info Note */}
      <div className="mt-8 p-4 bg-teal-50 rounded-lg border border-teal-200">
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-slate-900 font-medium mb-1">Your information is secure</p>
            <p className="text-sm text-gray-600">
              This is your basic profile. More detailed medical information will be collected during your consultation, if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
