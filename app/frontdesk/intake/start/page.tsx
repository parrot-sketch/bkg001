'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  Copy,
  Loader2,
  QrCode,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

interface IntakeSession {
  sessionId: string;
  qrCodeUrl: string;
  intakeFormUrl: string;
  expiresAt: string;
  minutesRemaining: number;
}

export default function StartIntakePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<IntakeSession | null>(null);
  const [copied, setCopied] = useState(false);

  const handleStartIntake = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/frontdesk/intake/start', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start intake session');
      }

      const data: IntakeSession = await response.json();
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (session?.intakeFormUrl) {
      navigator.clipboard.writeText(session.intakeFormUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/frontdesk/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Start Patient Intake
          </h1>
          <p className="text-gray-600">
            Initiate a new patient intake session and generate a QR code for the patient to scan
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!session ? (
          <Card>
            <CardHeader>
              <CardTitle>Create New Intake Session</CardTitle>
              <CardDescription>
                Click the button below to generate a new patient intake session with a unique QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">How it works:</h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li>1. Click "Start Intake Session" below</li>
                  <li>2. A QR code will be generated</li>
                  <li>3. Patient scans QR code with their phone</li>
                  <li>4. Patient fills intake form privately</li>
                  <li>5. Form submitted - you'll see it in pending intakes</li>
                </ol>
              </div>

              <Button
                onClick={handleStartIntake}
                disabled={isLoading}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Start Intake Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Success Alert */}
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Session Created</AlertTitle>
              <AlertDescription className="text-green-700">
                Intake session is active and ready. Patient has {session.minutesRemaining} minutes to complete the form.
              </AlertDescription>
            </Alert>

            {/* QR Code Section */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>
                  Patient scans this QR code with their mobile device
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                {/* QR Code Display */}
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
                  <img
                    src={session.qrCodeUrl}
                    alt="Intake Form QR Code"
                    className="w-64 h-64"
                  />
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Session ID</p>
                  <code className="text-xs bg-gray-100 px-3 py-2 rounded font-mono">
                    {session.sessionId}
                  </code>
                </div>

                <div className="w-full text-center">
                  <p className="text-xs text-gray-500 mb-2">
                    Session expires in {session.minutesRemaining} minutes
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Intake URL Section */}
            <Card>
              <CardHeader>
                <CardTitle>Intake Form URL</CardTitle>
                <CardDescription>
                  Alternative: Share this link if patient cannot scan QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                  <input
                    type="text"
                    value={session.intakeFormUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm font-mono text-gray-700 outline-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Show QR code to patient</p>
                      <p className="text-sm text-gray-600">Let patient scan with their phone</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Patient fills intake form</p>
                      <p className="text-sm text-gray-600">Form is private - you won't see the data</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Review and confirm</p>
                      <p className="text-sm text-gray-600">
                        <Link href="/frontdesk/intake/pending" className="text-primary hover:underline">
                          View pending intakes
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <Link href="/frontdesk/intake/pending">
                    <Button className="w-full" variant="default">
                      View Pending Intakes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Start Another Session */}
            <Button
              variant="outline"
              onClick={() => setSession(null)}
              className="w-full"
            >
              Start Another Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
