'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';

interface MedicalHistoryTabProps {
  patient: PatientResponseDto;
}

export function MedicalHistoryTab({ patient }: MedicalHistoryTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical History</CardTitle>
        <CardDescription>Patient's medical background and conditions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {patient.medicalHistory ? (
          <div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{patient.medicalHistory}</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No medical history recorded</p>
          </div>
        )}
        {patient.medicalConditions && (
          <div className="pt-4 border-t">
            <p className="text-sm font-semibold mb-2">Medical Conditions</p>
            <p className="text-sm text-foreground">{patient.medicalConditions}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
