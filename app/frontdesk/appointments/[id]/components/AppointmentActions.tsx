import { CheckCircle, User, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface AppointmentActionsProps {
  appointmentId: number;
  patientId: string;
  showAwaitingConfirmation: boolean;
  showCheckInButton: boolean;
  isCheckingIn: boolean;
  onCheckIn: () => void;
}

export function AppointmentActions({
  appointmentId,
  patientId,
  showAwaitingConfirmation,
  showCheckInButton,
  isCheckingIn,
  onCheckIn,
}: AppointmentActionsProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAwaitingConfirmation && (
          <div className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-xs font-medium">
              Awaiting doctor confirmation. Check-in will be available once the doctor confirms this appointment.
            </p>
          </div>
        )}

        {showCheckInButton && (
          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 font-semibold"
            onClick={onCheckIn}
            disabled={isCheckingIn}
          >
            {isCheckingIn ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Checking In...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Check In Patient
              </>
            )}
          </Button>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push(`/frontdesk/patient/${patientId}`)}
        >
          <User className="h-4 w-4 mr-2" />
          View Patient Profile
        </Button>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => router.push('/frontdesk/appointments')}
        >
          <FileText className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>
      </CardContent>
    </Card>
  );
}
