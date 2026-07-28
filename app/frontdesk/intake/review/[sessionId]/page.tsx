'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface IntakeSubmissionDTO {
  submissionId: string;
  sessionId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    whatsappPhone?: string;
    address: string;
    maritalStatus?: string;
    occupation?: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  medicalInfo: {
    bloodGroup?: string;
    allergies?: string;
    medicalConditions?: string;
    medicalHistory?: string;
  };
  insuranceInfo: {
    provider?: string;
    policyNumber?: string;
  };
  consent: {
    privacyConsent: boolean;
    serviceConsent: boolean;
    medicalConsent: boolean;
  };
  submittedAt: string;
  status: 'PENDING' | 'CONFIRMED';
  completenessScore: number;
  isComplete: boolean;
  incompleteFields?: string[];
}

export default function ReviewIntakePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<IntakeSubmissionDTO | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await apiClient.get<IntakeSubmissionDTO>(`/frontdesk/intake/${sessionId}`);

        if (!result.success) {
          throw new Error(result.error || 'Intake submission not found');
        }

        setSubmission(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchSubmission();
    }
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="mt-4 text-gray-600">Loading intake submission...</p>
        </div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Link href="/frontdesk/intake/pending" className="flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Pending
          </Link>

          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-gray-600">Intake submission not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href="/frontdesk/patients" className="flex items-center gap-2 text-primary hover:underline mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Patients
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {submission.personalInfo.firstName} {submission.personalInfo.lastName}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Submitted {format(new Date(submission.submittedAt), 'PPp')}
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex flex-col items-end gap-3">
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Auto-confirmed
            </div>
          </div>
        </div>

        {/* Success Message */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            This intake was automatically confirmed and the patient record was created.
          </AlertDescription>
        </Alert>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">First Name</p>
              <p className="font-medium">{submission.personalInfo.firstName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Name</p>
              <p className="font-medium">{submission.personalInfo.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date of Birth</p>
              <p className="font-medium">
                {format(new Date(submission.personalInfo.dateOfBirth), 'MMM d, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="font-medium capitalize">{submission.personalInfo.gender}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium break-all">{submission.contactInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{submission.contactInfo.phone}</p>
              </div>
            </div>

            {submission.contactInfo.whatsappPhone && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">WhatsApp Number</p>
                  <p className="font-medium">{submission.contactInfo.whatsappPhone}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium">{submission.contactInfo.address}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {submission.contactInfo.maritalStatus && (
                <div>
                  <p className="text-sm text-gray-600">Marital Status</p>
                  <p className="font-medium capitalize">{submission.contactInfo.maritalStatus}</p>
                </div>
              )}
              {submission.contactInfo.occupation && (
                <div>
                  <p className="text-sm text-gray-600">Occupation</p>
                  <p className="font-medium">{submission.contactInfo.occupation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium">{submission.emergencyContact.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{submission.emergencyContact.phone}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-600">Relation</p>
              <p className="font-medium">{submission.emergencyContact.relation}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button asChild>
            <Link href="/frontdesk/patients">View Patients</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
