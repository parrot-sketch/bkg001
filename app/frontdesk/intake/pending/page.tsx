'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  RefreshCw,
  Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PatientData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}

interface PendingIntake {
  sessionId: string;
  submissionId: string;
  submittedAt: string;
  patientData: PatientData;
  completenessScore: number;
  missingFields: string[];
}

interface PendingIntakesResponse {
  intakes: PendingIntake[];
  total: number;
  limit: number;
  offset: number;
}

export default function PendingIntakesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intakes, setIntakes] = useState<PendingIntake[]>([]);
  const [total, setTotal] = useState(0);

  const fetchPendingIntakes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/frontdesk/intake/pending?limit=20&offset=0');

      if (!response.ok) {
        throw new Error('Failed to fetch pending intakes');
      }

      const data: PendingIntakesResponse = await response.json();
      setIntakes(data.intakes);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingIntakes();
  }, []);

  const getCompletenessColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-blue-600 bg-blue-50';
    return 'text-amber-600 bg-amber-50';
  };

  const getCompletenessLabel = (score: number) => {
    if (score >= 90) return 'Complete';
    if (score >= 75) return 'Mostly Complete';
    return 'Incomplete';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/frontdesk/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Pending Intakes
              </h1>
              <p className="text-gray-600">
                {total} patient intake{total !== 1 ? 's' : ''} awaiting review and confirmation
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={fetchPendingIntakes}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Link href="/frontdesk/intake/start">
                <Button>Start New Intake</Button>
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : intakes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Inbox className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Pending Intakes
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                There are no patient intake forms awaiting review at this time.
              </p>
              <Link href="/frontdesk/intake/start">
                <Button>Start New Intake Session</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {intakes.map((intake) => (
              <Card key={intake.sessionId} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Patient Info */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Patient Name
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {intake.patientData.firstName} {intake.patientData.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Email
                        </p>
                        <p className="text-sm text-gray-700">{intake.patientData.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Phone
                        </p>
                        <p className="text-sm text-gray-700">{intake.patientData.phone}</p>
                      </div>
                    </div>

                    {/* Submission Details */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Submitted
                        </p>
                        <p className="text-sm text-gray-700">
                          {formatDistanceToNow(new Date(intake.submittedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Address
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {intake.patientData.address}
                        </p>
                      </div>
                      {intake.missingFields.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">
                            Missing Fields
                          </p>
                          <p className="text-xs text-amber-600">
                            {intake.missingFields.length} field(s)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Completeness & Action */}
                    <div className="flex flex-col items-end justify-between">
                      <div className="text-right space-y-2">
                        <div
                          className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getCompletenessColor(
                            intake.completenessScore,
                          )}`}
                        >
                          {intake.completenessScore}% - {getCompletenessLabel(intake.completenessScore)}
                        </div>
                        {intake.missingFields.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {intake.missingFields.length} field(s) to verify
                          </div>
                        )}
                      </div>

                      <Link href={`/frontdesk/intake/review/${intake.sessionId}`}>
                        <Button size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Review & Confirm
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
