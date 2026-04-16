'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Mail, Phone, Stethoscope, User2 } from 'lucide-react';

import type { PreOpCasePatient, PreOpCaseSurgeon } from '@/lib/api/nurse';

export function PatientDetailsCard(props: { patient: PreOpCasePatient | null }) {
  const { patient } = props;
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-semibold text-slate-800">Patient Details</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
            <User2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{patient?.fullName || 'Unknown patient'}</p>
            <p className="text-xs text-slate-500">File: {patient?.fileNumber || '--'}</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {patient?.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {patient.phone}
            </div>
          )}
          {patient?.email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
          {patient?.dateOfBirth && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SurgicalTeamCard(props: { surgeon: PreOpCaseSurgeon | null }) {
  const { surgeon } = props;
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-semibold text-slate-800">Surgical Team</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium uppercase">Primary Surgeon</p>
            <p className="text-sm font-medium text-slate-900 truncate">{surgeon?.name || 'Unassigned'}</p>
            {surgeon?.specialty && <p className="text-xs text-slate-500 truncate">{surgeon.specialty}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CaseInfoCard(props: { createdAt: Date; urgency: string; diagnosis?: string | null }) {
  const { createdAt, urgency, diagnosis } = props;
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-sm font-semibold text-slate-800">Case Info</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Urgency</span>
          <Badge variant={urgency === 'ELECTIVE' ? 'outline' : 'secondary'}>{urgency}</Badge>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500">Created</span>
          <span className="font-medium text-slate-700">{format(new Date(createdAt), 'MMM d, yyyy')}</span>
        </div>
        {diagnosis ? (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-1">Diagnosis</p>
            <p className="text-sm text-slate-800">{diagnosis}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

