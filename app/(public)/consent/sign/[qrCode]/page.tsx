'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad } from '@/components/consent/SignaturePad';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ApiResponse, isSuccess } from '@/lib/http/apiResponse';
import { PdfViewer } from '@/components/pdf';

interface ConsentData {
  consentForm: {
    id: string;
    title: string;
    type: string;
    content: string;
    version: number;
    pdfUrl?: string | null;
  };
  session: {
    id: string;
    status: string;
    requiresStaffVerify: boolean;
    verifiedByStaff: boolean;
    expiresAt: string;
  };
  patientName: string;
}

type Step = 'verify' | 'otp' | 'sign' | 'success';

export default function ConsentSigningPage() {
  const params = useParams();
  const qrCode = params.qrCode as string;

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('verify');
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [patientName, setPatientName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [otp, setOtp] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    loadConsentData();
  }, [qrCode]);

  const loadConsentData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/consent/sign/${qrCode}`);
      const json: ApiResponse<ConsentData> = await res.json();

      if (!isSuccess(json)) {
        toast.error(json.error || 'Failed to load consent form');
        return;
      }

      setConsentData(json.data);

      // Check if staff verification is required
      if (json.data.session.requiresStaffVerify && !json.data.session.verifiedByStaff) {
        toast.warning('Staff verification required. Please contact your doctor.');
      }
    } catch (error) {
      toast.error('Failed to load consent form');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIdentity = async () => {
    if (!patientName || !dateOfBirth) {
      toast.error('Please enter your name and date of birth');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/consent/sign/${qrCode}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName, dateOfBirth }),
      });

      const json: ApiResponse<{ verified: boolean; requiresOtp: boolean }> = await res.json();

      if (!isSuccess(json)) {
        toast.error(json.error || 'Identity verification failed');
        return;
      }

      if (json.data.requiresOtp) {
        setStep('otp');
        // Automatically send OTP
        await sendOTP();
      } else {
        setStep('sign');
      }
    } catch (error) {
      toast.error('Failed to verify identity');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const sendOTP = async () => {
    try {
      setOtpSent(false);
      const res = await fetch(`/api/public/consent/sign/${qrCode}/otp`, {
        method: 'POST',
      });

      const json: ApiResponse<{ message: string }> = await res.json();

      if (!isSuccess(json)) {
        toast.error(json.error || 'Failed to send OTP');
        return;
      }

      setOtpSent(true);
      toast.success('OTP sent to your phone number');
    } catch (error) {
      toast.error('Failed to send OTP');
      console.error(error);
    }
  };

  const handleValidateOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP code');
      return;
    }

    try {
      setVerifyingOtp(true);
      const res = await fetch(`/api/public/consent/sign/${qrCode}/otp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });

      const json: ApiResponse<{ valid: boolean }> = await res.json();

      if (!isSuccess(json)) {
        toast.error(json.error || 'Invalid OTP code');
        return;
      }

      setStep('sign');
      toast.success('OTP verified successfully');
    } catch (error) {
      toast.error('Failed to validate OTP');
      console.error(error);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmitSignature = async () => {
    if (!signature) {
      toast.error('Please provide your signature');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/consent/sign/${qrCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientSignature: signature,
          patientName,
          dateOfBirth,
          otp: step === 'otp' ? otp : undefined,
        }),
      });

      const json: ApiResponse<{ success: boolean; pdfUrl?: string }> = await res.json();

      if (!isSuccess(json)) {
        toast.error(json.error || 'Failed to submit signature');
        return;
      }

      setStep('success');
      toast.success('Consent signed successfully!');
    } catch (error) {
      toast.error('Failed to submit signature');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-4 text-gray-600">Loading consent form...</p>
        </div>
      </div>
    );
  }

  if (!consentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Consent Form Not Found</h2>
              <p className="text-gray-600">The QR code is invalid or has expired.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Consent Signed Successfully!</h2>
              <p className="text-gray-600 mb-4">
                Your consent form has been signed and recorded.
              </p>
              <p className="text-sm text-gray-500">
                You can close this page now.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{consentData.consentForm.title}</CardTitle>
            <p className="text-sm text-gray-600">
              Patient: {consentData.patientName}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Consent Content */}
            {consentData.consentForm.pdfUrl ? (
              <div className="border rounded-md overflow-hidden mb-6">
                <PdfViewer file={consentData.consentForm.pdfUrl} height={600} showDownload={false} />
              </div>
            ) : (
              <div className="prose max-w-none">
                <div
                  className="text-sm text-gray-700 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: consentData.consentForm.content }}
                />
              </div>
            )}

            {/* Identity Verification Step */}
            {step === 'verify' && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-semibold">Verify Your Identity</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="patientName">Full Name</Label>
                    <Input
                      id="patientName"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleVerifyIdentity}
                    disabled={submitting || !patientName || !dateOfBirth}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Identity'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* OTP Verification Step */}
            {step === 'otp' && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-semibold">Enter Verification Code</h3>
                <p className="text-sm text-gray-600">
                  We've sent a 6-digit code to your phone number. Please enter it below.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="otp">OTP Code</Label>
                    <Input
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleValidateOTP}
                      disabled={verifyingOtp || otp.length !== 6}
                      className="flex-1"
                    >
                      {verifyingOtp ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : (
                        'Verify OTP'
                      )}
                    </Button>
                    <Button
                      onClick={sendOTP}
                      variant="outline"
                      disabled={otpSent}
                    >
                      {otpSent ? 'Sent' : 'Resend'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Step */}
            {step === 'sign' && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="font-semibold">Sign Consent Form</h3>
                <p className="text-sm text-gray-600">
                  Please sign below to confirm your consent.
                </p>
                <SignaturePad onSignatureChange={setSignature} />
                <Button
                  onClick={handleSubmitSignature}
                  disabled={submitting || !signature}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Signature'
                  )}
                </Button>
              </div>
            )}

            {/* Staff Verification Notice */}
            {consentData.session.requiresStaffVerify && !consentData.session.verifiedByStaff && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Staff Verification Required
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      A staff member must verify your identity before you can sign this consent form.
                      Please contact your doctor or nurse.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
