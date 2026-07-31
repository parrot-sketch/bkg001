'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Loader2, RefreshCw, History, Search, Calendar } from 'lucide-react';
import type { PatientResponseDto } from '@/application/dtos/PatientResponseDto';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { cn } from '@/lib/utils';
import { getPatientConsultationHistory, type ConsultationHistoryItem, type PreviousConsultationNotes } from '@/actions/doctor/get-patient-consultation-history';
import { loadPreviousConsultationNotes } from '@/actions/doctor/get-patient-consultation-history';

interface VitalsData {
  bodyTemperature: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: string | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  recordedAt: string;
  recordedBy: string | null;
}

interface PatientPanelProps {
  patient: PatientResponseDto;
  appointment?: AppointmentResponseDto | null;
  vitals?: VitalsData | null;
  onRefresh?: () => Promise<void>;
  refetchKey?: number;
}

export function PatientPanel({ patient, appointment, vitals = null, onRefresh, refetchKey = 0 }: PatientPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [history, setHistory] = useState<ConsultationHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedPreviousConsultation, setSelectedPreviousConsultation] = useState<PreviousConsultationNotes | null>(null);

  const currentAppointmentId = appointment?.id;

  const visibleHistory = useMemo(() => {
    const hasActiveFilter = searchQuery.trim().length > 0 || dateFilter.trim().length > 0;

    if (!hasActiveFilter && history.length > 0) {
      return [history[0]];
    }

    let base = history;
    if (currentAppointmentId) {
      base = base.filter((item) => {
        if (item.appointmentId !== currentAppointmentId) return true;
        const isCurrentActive = appointment?.status !== 'COMPLETED' && appointment?.status !== 'CANCELLED';
        return !isCurrentActive;
      });
    }

    const textMatch = (item: ConsultationHistoryItem) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const haystack = [
        item.appointmentDate,
        item.appointmentTime,
        item.state,
        item.outcomeType,
        item.patientDecision,
        item.notesSummary,
        item.doctor?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    };

    const dateMatch = (item: ConsultationHistoryItem) => {
      if (!dateFilter.trim()) return true;
      const filterDate = new Date(dateFilter);
      if (Number.isNaN(filterDate.getTime())) return true;
      const itemDate = new Date(item.appointmentDate);
      return (
        itemDate.getFullYear() === filterDate.getFullYear() &&
        itemDate.getMonth() === filterDate.getMonth() &&
        itemDate.getDate() === filterDate.getDate()
      );
    };

    return base.filter((item) => textMatch(item) && dateMatch(item));
  }, [history, currentAppointmentId, searchQuery, dateFilter, appointment?.status]);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const age = patient.dateOfBirth
    ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 86400000))
    : null;

  useEffect(() => {
    let cancelled = false;
    const patientId = patient?.id;

    const loadHistory = async () => {
      if (!patientId) {
        setHistory([]);
        setIsLoadingHistory(false);
        return;
      }

      setHistory([]);
      setIsLoadingHistory(true);
      setError(null);

      try {
        const result = await getPatientConsultationHistory(patientId);
        if (cancelled) return;
        if (result.success) {
          setHistory(result.data.consultations);
        } else {
          setError(result.error?.message || 'Failed to load history');
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || 'Failed to load history');
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [patient?.id, refetchKey]);

  const handleSelectConsultation = async (consultation: ConsultationHistoryItem) => {
    if (selectedPreviousConsultation?.appointmentId === consultation.appointmentId) {
      setSelectedPreviousConsultation(null);
      return;
    }

    setIsLoadingNotes(true);
    try {
      const result = await loadPreviousConsultationNotes(consultation.appointmentId);
      if (result.success) {
        setSelectedPreviousConsultation({
          appointmentId: consultation.appointmentId,
          consultationId: result.data.consultationId,
          appointmentDate: consultation.appointmentDate,
          appointmentTime: consultation.appointmentTime,
          state: consultation.state,
          notes: result.data.notes,
          outcomeType: consultation.outcomeType,
          patientDecision: consultation.patientDecision,
        });
      } else {
        setError(result.error?.message || 'Failed to load consultation');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load consultation');
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getOutcomeLabel = (outcomeType?: string) => {
    if (!outcomeType) return null;
    return outcomeType.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Patient Identity */}
      <div className="px-4 py-4 bg-[#e7d6bf]/30 border-b border-[#e7d6bf] shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#caa26a] flex items-center justify-center text-sm font-bold text-white shrink-0">
            {patient.firstName?.[0]}{patient.lastName?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#2c2e4b] truncate">
              {patient.firstName} {patient.lastName}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-[#2c2e4b]/60 mt-0.5">
              {patient.fileNumber && <span className="font-mono">{patient.fileNumber}</span>}
              {age !== null && <span className="text-[#e7d6bf]">•</span>}
              {age !== null && <span>{age} yrs</span>}
              {patient.gender && <span className="text-[#e7d6bf]">•</span>}
              <span className="capitalize">{patient.gender?.toLowerCase()}</span>
            </div>
          </div>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-md hover:bg-[#e7d6bf]/40 transition-colors text-[#2c2e4b]/50 hover:text-[#2c2e4b] disabled:opacity-50"
              aria-label="Refresh patient data"
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar-light">
        <div className="py-2 space-y-1">
          {/* Previous Consultations */}
          <Section title="Previous Consultations">
            <div className="space-y-2 mb-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by outcome, notes, status..."
                  className="w-full h-8 pl-8 pr-2 text-[11px] rounded-md border border-[#e7d6bf] bg-white placeholder:text-[#2c2e4b]/40 focus:outline-none focus:border-[#caa26a]"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#2c2e4b]/40" />
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full h-8 pl-8 pr-2 text-[11px] rounded-md border border-[#e7d6bf] bg-white placeholder:text-[#2c2e4b]/40 focus:outline-none focus:border-[#caa26a]"
                />
                <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#2c2e4b]/40" />
              </div>
            </div>
            {(searchQuery || dateFilter) && (
              <p className="text-[10px] text-[#2c2e4b]/50 mb-2 px-1">
                {visibleHistory.length} result{visibleHistory.length !== 1 ? 's' : ''} found
              </p>
            )}
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
              </div>
            ) : error ? (
              <p className="text-[11px] text-red-600 px-3 py-2">{error}</p>
            ) : history.length === 0 ? (
              <p className="text-[11px] text-[#2c2e4b]/40 px-3 py-2">No previous consultations</p>
            ) : (
              <div className="space-y-1.5">
                {visibleHistory.map((consultation) => {
                  const isSelected = selectedPreviousConsultation?.appointmentId === consultation.appointmentId;
                  return (
                    <div key={consultation.appointmentId}>
                      <button
                        onClick={() => handleSelectConsultation(consultation)}
                        disabled={isLoadingNotes}
                        className={cn(
                          'w-full text-left rounded-lg border transition-colors',
                          isSelected
                            ? 'bg-[#caa26a]/10 border-[#caa26a]/40 shadow-sm'
                            : 'bg-[#fcfbf8] border-[#e7d6bf] hover:border-[#caa26a]/40 hover:shadow-sm'
                        )}
                      >
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-[#2c2e4b]">
                              {formatDate(consultation.appointmentDate)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {consultation.durationMinutes && (
                                <span className="text-[9px] text-[#2c2e4b]/40">
                                  {consultation.durationMinutes}m
                                </span>
                              )}
                              {consultation.outcomeType && (
                                <span className="text-[9px] text-[#caa26a] font-medium capitalize">
                                  {getOutcomeLabel(consultation.outcomeType)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[#2c2e4b]/50">
                              {consultation.doctor?.name || 'Unknown'} · {consultation.state}
                            </span>
                            <span className="text-[9px] text-[#2c2e4b]/40">
                              {isSelected ? '▼' : '▶'}
                            </span>
                          </div>
                          {!isSelected && consultation.notesSummary && (
                            <p className="text-[10px] text-[#2c2e4b]/60 mt-1.5 line-clamp-2 leading-relaxed">
                              {consultation.notesSummary}
                            </p>
                          )}
                        </div>
                      </button>
                      {isSelected && selectedPreviousConsultation && (
                        <div className="px-3 py-2.5 bg-[#fcfbf8] border-x border-b border-[#e7d6bf] rounded-b-lg mt-0.5">
                          <div className="max-h-48 overflow-y-auto custom-scrollbar-light pr-1 space-y-2">
                            {selectedPreviousConsultation.notes.structured ? (
                              <div className="space-y-2.5">
                                {selectedPreviousConsultation.notes.structured.chiefComplaint && (
                                  <ColoredNoteBlock label="Subjective" content={selectedPreviousConsultation.notes.structured.chiefComplaint} color="gold" />
                                )}
                                {selectedPreviousConsultation.notes.structured.examination && (
                                  <ColoredNoteBlock label="Objective" content={selectedPreviousConsultation.notes.structured.examination} color="dark" />
                                )}
                                {selectedPreviousConsultation.notes.structured.assessment && (
                                  <ColoredNoteBlock label="Assessment" content={selectedPreviousConsultation.notes.structured.assessment} color="sand" />
                                )}
                                {selectedPreviousConsultation.notes.structured.plan && (
                                  <ColoredNoteBlock label="Plan" content={selectedPreviousConsultation.notes.structured.plan} color="bronze" />
                                )}
                              </div>
                            ) : selectedPreviousConsultation.notes.fullText ? (
                              <ColoredNoteBlock label="Notes" content={selectedPreviousConsultation.notes.fullText} color="gold" />
                            ) : (
                              <p className="text-[11px] text-[#2c2e4b]/40 italic">No notes recorded</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Vitals */}
          {vitals && (
            <Section title="Vitals">
              <VitalsGrid vitals={vitals} />
            </Section>
          )}

          {/* Allergies */}
          {patient.allergies && (
            <Section title="Allergies">
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{patient.allergies}</span>
              </div>
            </Section>
          )}

          {/* Conditions */}
          {patient.medicalConditions && (
            <Section title="Conditions">
              <p className="text-xs text-slate-600 leading-relaxed">{patient.medicalConditions}</p>
            </Section>
          )}

          {/* Contact */}
          <Section title="Contact">
            <div className="space-y-1.5">
              {patient.phone && <Row label="Phone" value={patient.phone} />}
              {patient.email && <Row label="Email" value={patient.email} />}
              {patient.address && <Row label="Address" value={patient.address} />}
            </div>
          </Section>

          {/* Emergency */}
          {patient.emergencyContactName && (
            <Section title="Emergency Contact">
              <div className="space-y-1.5">
                <Row label="Name" value={patient.emergencyContactName} />
                {patient.emergencyContactNumber && <Row label="Phone" value={patient.emergencyContactNumber} />}
                {patient.relation && <Row label="Relation" value={patient.relation} />}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-white border-b border-[#e7d6bf]">
      <p className="text-[10px] font-semibold text-[#caa26a] uppercase tracking-wider mb-2">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-[#2c2e4b]/50 w-12 shrink-0">{label}</span>
      <span className="text-[#2c2e4b] break-all">{value}</span>
    </div>
  );
}

const NOTE_STYLES: Record<string, { labelBg: string; bodyText: string }> = {
  gold: { labelBg: 'bg-[#caa26a]', bodyText: 'text-[#2c2e4b]' },
  dark: { labelBg: 'bg-[#2c2e4b]', bodyText: 'text-[#2c2e4b]' },
  sand: { labelBg: 'bg-[#e7d6bf]', bodyText: 'text-[#2c2e4b]' },
  bronze: { labelBg: 'bg-[#b8956a]', bodyText: 'text-[#2c2e4b]' },
};

function ColoredNoteBlock({ label, content, color = 'gold' }: { label: string; content: string; color?: keyof typeof NOTE_STYLES }) {
  const style = NOTE_STYLES[color] || NOTE_STYLES.gold;

  return (
    <div className="rounded-lg border border-[#e7d6bf] bg-white overflow-hidden">
      <div className={`px-2.5 py-1 ${style.labelBg} text-white`}>
        <p className="text-[9px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <div
        className={`px-3 py-2 text-[11px] ${style.bodyText} leading-relaxed prose prose-sm max-w-none`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

function VitalsGrid({ vitals }: { vitals: VitalsData }) {
  const items = [
    { label: 'Temp', value: vitals.bodyTemperature != null ? `${vitals.bodyTemperature}°C` : null, warn: vitals.bodyTemperature != null && (vitals.bodyTemperature < 36 || vitals.bodyTemperature > 38) },
    { label: 'BP', value: vitals.systolic != null && vitals.diastolic != null ? `${vitals.systolic}/${vitals.diastolic}` : null, warn: vitals.systolic != null && vitals.diastolic != null && (vitals.systolic < 90 || vitals.diastolic > 140) },
    { label: 'HR', value: vitals.heartRate ? `${vitals.heartRate} bpm` : null, warn: false },
    { label: 'RR', value: vitals.respiratoryRate != null ? `${vitals.respiratoryRate}/min` : null, warn: vitals.respiratoryRate != null && (vitals.respiratoryRate < 12 || vitals.respiratoryRate > 20) },
    { label: 'SpO₂', value: vitals.oxygenSaturation != null ? `${vitals.oxygenSaturation}%` : null, warn: vitals.oxygenSaturation != null && vitals.oxygenSaturation < 95 },
    { label: 'Wt', value: vitals.weight != null ? `${vitals.weight}kg` : null, warn: false },
    { label: 'Ht', value: vitals.height != null ? `${vitals.height}cm` : null, warn: false },
  ].filter((i) => i.value != null);

  if (items.length === 0) return <p className="text-[11px] text-[#2c2e4b]/40 italic">No vitals recorded</p>;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-[11px]">
          <span className="text-[#2c2e4b]/50 w-7 shrink-0">{item.label}</span>
          <span className={cn('font-medium', item.warn ? 'text-[#caa26a]' : 'text-[#2c2e4b]')}>
            {item.value}
            {item.warn && <AlertTriangle className="inline h-3 w-3 ml-0.5 text-[#caa26a]" />}
          </span>
        </div>
      ))}
    </div>
  );
}
