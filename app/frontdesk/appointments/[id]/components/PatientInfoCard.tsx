import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PatientInfoCardProps {
  patient?: any;
  patientName: string;
}

export function PatientInfoCard({ patient, patientName }: PatientInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-slate-500" />
          Patient Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-600">
              {patientName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{patientName}</h3>
            {patient?.email && (
              <p className="text-sm text-slate-500">{patient.email}</p>
            )}
            {patient?.phone && (
              <p className="text-sm text-slate-500">{patient.phone}</p>
            )}
          </div>
        </div>
        {patient?.fileNumber && (
          <div className="pt-4 border-t">
            <span className="text-sm text-slate-500">File Number: </span>
            <span className="text-sm font-medium">{patient.fileNumber}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
