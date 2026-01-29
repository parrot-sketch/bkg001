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
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  FileText,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

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
  const [isConfirming, setIsConfirming] = useState(false);
  const [submission, setSubmission] = useState<IntakeSubmissionDTO | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/frontdesk/intake/${sessionId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Intake submission not found');
          }
          throw new Error('Failed to fetch intake submission');
        }

        const data = await response.json();
        setSubmission(data);
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

  const handleConfirm = async () => {
    if (!submission) return;

    try {
      setIsConfirming(true);
      setError(null);

      const response = await fetch('/api/frontdesk/intake/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm intake');
      }

      const result = await response.json();
      setSuccessMessage(
        `Patient ${result.firstName} ${result.lastName} confirmed. File #${result.fileNumber}`,
      );

      // Redirect to pending intakes after 2 seconds
      setTimeout(() => {
        router.push('/frontdesk/intake/pending');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
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
            <Link href="/frontdesk/intake/pending" className="flex items-center gap-2 text-primary hover:underline mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Pending
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
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                submission.completenessScore >= 90
                  ? 'bg-green-100 text-green-800'
                  : submission.completenessScore >= 75
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {submission.completenessScore}% Complete
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Completeness Breakdown */}
        {!submission.isComplete && submission.incompleteFields && submission.incompleteFields.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <p className="mb-2 font-medium">
                Missing {submission.incompleteFields.length} required field(s):
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {submission.incompleteFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </AlertDescription>
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

        {/* Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {submission.medicalInfo.bloodGroup && (
                <div>
                  <p className="text-sm text-gray-600">Blood Group</p>
                  <p className="font-medium">{submission.medicalInfo.bloodGroup}</p>
                </div>
              )}
            </div>

            {submission.medicalInfo.allergies && (
              <div>
                <p className="text-sm text-gray-600">Allergies</p>
                <p className="font-medium">{submission.medicalInfo.allergies}</p>
              </div>
            )}

            {submission.medicalInfo.medicalConditions && (
              <div>
                <p className="text-sm text-gray-600">Medical Conditions</p>
                <p className="font-medium">{submission.medicalInfo.medicalConditions}</p>
              </div>
            )}

            {submission.medicalInfo.medicalHistory && (
              <div>
                <p className="text-sm text-gray-600">Medical History</p>
                <p className="font-medium">{submission.medicalInfo.medicalHistory}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Insurance Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            {submission.insuranceInfo.provider && (
              <div>
                <p className="text-sm text-gray-600">Insurance Provider</p>
                <p className="font-medium">{submission.insuranceInfo.provider}</p>
              </div>
            )}
            {submission.insuranceInfo.policyNumber && (
              <div>
                <p className="text-sm text-gray-600">Policy Number</p>
                <p className="font-medium">{submission.insuranceInfo.policyNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consent Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Consent Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {submission.consent.privacyConsent ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">Privacy Policy Consent</span>
            </div>
            <div className="flex items-center gap-3">
              {submission.consent.serviceConsent ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">Service Terms Consent</span>
            </div>
            <div className="flex items-center gap-3">
              {submission.consent.medicalConsent ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">Medical Data Processing Consent</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {submission.status === 'PENDING' && (
            <>
              <Button
                onClick={handleConfirm}
                disabled={!submission.isComplete || isConfirming}
                className="flex-1"
                size="lg"
              >
                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isConfirming ? 'Confirming...' : 'Confirm & Create Patient'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/frontdesk/intake/pending">Cancel</Link>
              </Button>
            </>
          )}

          {submission.status === 'CONFIRMED' && (
            <Alert className="col-span-full border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                This intake has already been confirmed and the patient record created.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
