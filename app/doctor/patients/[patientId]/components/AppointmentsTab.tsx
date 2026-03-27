'use client';

/**
 * AppointmentsTab — Visit Timeline
 *
 * Shows the patient's complete visit history as a chronological timeline.
 * Each visit card shows appointment + consultation + vitals + diagnosis + billing.
 */

import { useState } from 'react';
import type { VisitResponseDto } from '@/application/dtos/VisitResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  Stethoscope,
  FileText,
  Heart,
  Activity,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Play,
  Thermometer,
  CreditCard,
  Pill,
} from 'lucide-react';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';

interface AppointmentsTabProps {
  visits: VisitResponseDto[];
  hasActiveConsultation: (id: number) => boolean;
  onStartConsultation: (appointment: AppointmentResponseDto) => void;
  onContinueConsultation: (id: number) => void;
}

export function AppointmentsTab({
  visits,
  hasActiveConsultation,
  onStartConsultation,
  onContinueConsultation,
}: AppointmentsTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-stone-200">
        <Calendar className="h-8 w-8 text-stone-300 mb-3" />
        <p className="text-sm font-medium text-stone-600">No visits recorded</p>
        <p className="text-xs text-stone-400 mt-1">Visit history will appear here after appointments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visits.map((visit) => {
        const isExpanded = expandedId === visit.id;
        const isCompleted = visit.status === AppointmentStatus.COMPLETED;
        const isActive = visit.status === AppointmentStatus.IN_CONSULTATION;
        const isCancelled = visit.status === AppointmentStatus.CANCELLED;
        const isNoShow = visit.status === AppointmentStatus.NO_SHOW;
        const isScheduled = visit.status === AppointmentStatus.SCHEDULED || visit.status === AppointmentStatus.CONFIRMED;
        const isCheckedIn = visit.status === AppointmentStatus.CHECKED_IN || visit.status === AppointmentStatus.READY_FOR_CONSULTATION;

        return (
          <div
            key={visit.id}
            className={cn(
              'bg-white border rounded-xl overflow-hidden transition-all',
              isExpanded ? 'border-stone-300 shadow-md' : 'border-stone-200 hover:border-stone-300 hover:shadow-sm',
              isActive && 'border-violet-300 ring-1 ring-violet-100',
              isCancelled && 'opacity-60',
            )}
          >
            {/* Summary row */}
            <button
              className="w-full text-left px-4 py-3.5 flex items-center gap-3"
              onClick={() => setExpandedId(isExpanded ? null : visit.id)}
            >
              {/* Status dot */}
              <div className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                isCompleted && 'bg-emerald-500',
                isActive && 'bg-violet-500 animate-pulse',
                isCheckedIn && 'bg-sky-500',
                isScheduled && 'bg-amber-500',
                isCancelled && 'bg-slate-300',
                isNoShow && 'bg-rose-500',
              )} />

              {/* Date & time */}
              <div className="shrink-0 w-28">
                <p className="text-sm font-semibold text-stone-900">
                  {format(new Date(visit.date), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-stone-400">{visit.time} · {visit.type}</p>
              </div>

              {/* Doctor & chief complaint */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 truncate">
                  {visit.doctor?.name || 'Unassigned'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {visit.consultation?.chiefComplaint && (
                    <span className="text-xs text-stone-400 truncate max-w-[200px]">
                      {visit.consultation.chiefComplaint}
                    </span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <StatusBadge status={visit.status} />

              {/* Duration */}
              {visit.consultationDuration != null && (
                <span className="text-xs text-stone-400 shrink-0">
                  {visit.consultationDuration} min
                </span>
              )}

              {/* Expand icon */}
              {isExpanded
                ? <ChevronUp className="h-4 w-4 text-stone-400 shrink-0" />
                : <ChevronDown className="h-4 w-4 text-stone-400 shrink-0" />
              }
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-stone-100 px-4 py-4 space-y-4 bg-stone-50/50">
                {/* Quick actions for active/scheduled */}
                {(isScheduled || isCheckedIn) && (
                  <div className="flex items-center gap-2">
                    {hasActiveConsultation(visit.id) ? (
                      <Button size="sm" onClick={() => onContinueConsultation(visit.id)}>
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Continue Consultation
                      </Button>
                    ) : isScheduled ? (
                      <Button size="sm" onClick={() => onStartConsultation({
                        id: visit.id,
                        patientId: '',
                        doctorId: visit.doctor?.id || '',
                        appointmentDate: new Date(visit.date),
                        time: visit.time,
                        status: visit.status as any,
                        type: visit.type,
                        note: visit.note || undefined,
                      } as AppointmentResponseDto)}>
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Start Consultation
                      </Button>
                    ) : null}
                  </div>
                )}

                {/* Vitals + Consultation side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vitals */}
                  {visit.vitals.length > 0 && (
                    <SectionCard icon={Heart} title="Vitals" color="rose">
                      {visit.vitals.map((v) => (
                        <div key={v.id} className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                          {v.bodyTemperature != null && (
                            <VitalItem label="Temp" value={`${v.bodyTemperature}°C`} />
                          )}
                          {v.systolic != null && v.diastolic != null && (
                            <VitalItem label="BP" value={`${v.systolic}/${v.diastolic}`} />
                          )}
                          {v.heartRate && (
                            <VitalItem label="HR" value={`${v.heartRate} bpm`} />
                          )}
                          {v.respiratoryRate != null && (
                            <VitalItem label="RR" value={`${v.respiratoryRate}/min`} />
                          )}
                          {v.oxygenSaturation != null && (
                            <VitalItem label="SpO₂" value={`${v.oxygenSaturation}%`} />
                          )}
                          {v.weight != null && (
                            <VitalItem label="Weight" value={`${v.weight} kg`} />
                          )}
                          {v.height != null && (
                            <VitalItem label="Height" value={`${v.height} cm`} />
                          )}
                        </div>
                      ))}
                    </SectionCard>
                  )}

                  {/* Consultation */}
                  {visit.consultation && (
                    <SectionCard icon={Stethoscope} title="Consultation" color="violet">
                      {visit.consultation.chiefComplaint && (
                        <DetailRow label="Chief Complaint" value={visit.consultation.chiefComplaint} />
                      )}
                      {visit.consultation.examination && (
                        <DetailRow label="Examination" value={visit.consultation.examination} />
                      )}
                      {visit.consultation.assessment && (
                        <DetailRow label="Assessment" value={visit.consultation.assessment} />
                      )}
                      {visit.consultation.plan && (
                        <DetailRow label="Plan" value={visit.consultation.plan} />
                      )}
                      {visit.consultation.outcome && (
                        <DetailRow label="Outcome" value={visit.consultation.outcome} />
                      )}
                      {visit.consultation.doctorNotes && (
                        <DetailRow label="Doctor Notes" value={visit.consultation.doctorNotes} />
                      )}
                      {visit.consultation.durationMinutes != null && (
                        <p className="text-xs text-stone-400 mt-2">
                          Duration: {visit.consultation.durationMinutes} minutes
                        </p>
                      )}
                    </SectionCard>
                  )}
                </div>

                {/* Diagnosis + Prescriptions */}
                {visit.medicalRecords.some(mr => mr.diagnoses.length > 0) && (
                  <SectionCard icon={FileText} title="Diagnosis & Prescriptions" color="blue">
                    {visit.medicalRecords.map((mr) => (
                      <div key={mr.id} className="space-y-3">
                        {mr.diagnoses.map((d) => (
                          <div key={d.id} className="border-l-2 border-blue-200 pl-3">
                            <p className="text-sm font-medium text-stone-800">{d.diagnosis}</p>
                            {d.symptoms && (
                              <p className="text-xs text-stone-500 mt-0.5">
                                <span className="font-medium">Symptoms:</span> {d.symptoms}
                              </p>
                            )}
                            {d.prescribedMedications && (
                              <div className="mt-1.5 flex items-start gap-1.5">
                                <Pill className="h-3 w-3 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-blue-700">{d.prescribedMedications}</p>
                              </div>
                            )}
                            {d.followUpPlan && (
                              <p className="text-xs text-stone-400 mt-1">Follow-up: {d.followUpPlan}</p>
                            )}
                          </div>
                        ))}
                        {mr.treatmentPlan && (
                          <DetailRow label="Treatment Plan" value={mr.treatmentPlan} />
                        )}
                        {mr.labRequest && (
                          <DetailRow label="Lab Request" value={mr.labRequest} />
                        )}
                      </div>
                    ))}
                  </SectionCard>
                )}

                {/* Billing */}
                {visit.billing && (
                  <SectionCard icon={DollarSign} title="Billing" color="amber">
                    <div className="space-y-1.5">
                      {visit.billing.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-stone-600">{item.serviceName} × {item.quantity}</span>
                          <span className="text-stone-800 font-medium">{item.totalCost.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t border-stone-200 pt-2 mt-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-600">Total</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-900">{visit.billing.totalAmount.toLocaleString()}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold py-0 px-2 border-0',
                              visit.billing.status === 'PAID' && 'bg-emerald-50 text-emerald-700',
                              visit.billing.status === 'UNPAID' && 'bg-rose-50 text-rose-700',
                              visit.billing.status === 'PART' && 'bg-amber-50 text-amber-700',
                            )}
                          >
                            {visit.billing.status === 'PAID' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {visit.billing.status === 'UNPAID' && <CreditCard className="h-3 w-3 mr-1" />}
                            {visit.billing.status}
                          </Badge>
                        </div>
                      </div>
                      {visit.billing.amountPaid > 0 && visit.billing.amountPaid < visit.billing.totalAmount && (
                        <p className="text-xs text-amber-600">
                          Paid: {visit.billing.amountPaid.toLocaleString()} / {visit.billing.totalAmount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Visit note */}
                {visit.note && (
                  <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
                    <span className="font-medium text-stone-600">Note:</span> {visit.note}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
    IN_CONSULTATION: { label: 'In Progress', color: 'bg-violet-50 text-violet-700', icon: Play },
    CHECKED_IN: { label: 'Checked In', color: 'bg-sky-50 text-sky-700', icon: CheckCircle },
    READY_FOR_CONSULTATION: { label: 'Ready', color: 'bg-teal-50 text-teal-700', icon: CheckCircle },
    SCHEDULED: { label: 'Scheduled', color: 'bg-amber-50 text-amber-700', icon: Clock },
    CONFIRMED: { label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
    PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700', icon: Clock },
    PENDING_DOCTOR_CONFIRMATION: { label: 'Awaiting MD', color: 'bg-indigo-50 text-indigo-700', icon: Clock },
    CANCELLED: { label: 'Cancelled', color: 'bg-slate-50 text-slate-500', icon: XCircle },
    NO_SHOW: { label: 'No Show', color: 'bg-rose-50 text-rose-700', icon: AlertCircle },
  };

  const c = config[status] || { label: status, color: 'bg-slate-50 text-slate-600', icon: Clock };
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={cn('text-[10px] font-bold py-0.5 px-2 border-0 gap-1', c.color)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

function SectionCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: typeof Heart;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    rose: 'text-rose-500',
    violet: 'text-violet-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className={cn('h-4 w-4', colorMap[color] || 'text-stone-500')} />
        <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wide">{title}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs text-stone-700 mt-0.5">{value}</p>
    </div>
  );
}

function VitalItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-stone-400">{label}:</span>
      <span className="text-stone-800 font-medium">{value}</span>
    </div>
  );
}
