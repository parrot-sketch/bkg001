import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, FileText, CreditCard, Calendar, Clock, Activity, CheckCircle, Scissors, Download, Share2, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ConsultationDetailPageProps {
  params: Promise<{
    consultationId: string;
  }>;
}

async function getConsultationRecord(consultationId: number, doctorId: string) {
  const consultation = await db.consultation.findUnique({
    where: { id: consultationId },
    include: {
      appointment: {
        include: {
          patient: true,
        },
      },
      surgical_case: { select: { id: true } },
    },
  });

  if (!consultation || consultation.doctor_id !== doctorId) {
    return null;
  }

  // Get payment/billing data
  const payment = await db.payment.findFirst({
    where: { appointment_id: consultation.appointment_id },
    include: {
      bill_items: {
        include: { service: true },
      },
    },
  });

  // Transform data for the UI
  const patient = consultation.appointment.patient;
  
  // Fall back to doctor_notes if structured fields are empty
  const hasStructuredNotes = consultation.chief_complaint || consultation.examination || consultation.plan;
  const fallbackNotes = consultation.doctor_notes || '';
  
  // Parse doctor_notes to extract sections if needed
  let chiefComplaint = consultation.chief_complaint || '';
  let examination = consultation.examination || '';
  let plan = consultation.plan || '';
  
  if (!hasStructuredNotes && fallbackNotes) {
    // Try to extract sections from doctor_notes
    const chiefMatch = fallbackNotes.match(/Chief Complaint:([\s\S]*?)(?:Examination:|Plan:|=== CONSULTATION OUTCOME ===|$)/i);
    const examMatch = fallbackNotes.match(/Examination:([\s\S]*?)(?:Plan:|=== CONSULTATION OUTCOME ===|$)/i);
    const planMatch = fallbackNotes.match(/Plan:([\s\S]*?)(?:=== CONSULTATION OUTCOME ===|$)/i);
    
    if (chiefMatch) chiefComplaint = chiefMatch[1].trim();
    if (examMatch) examination = examMatch[1].trim();
    if (planMatch) plan = planMatch[1].trim();
  }
  
  const data = {
    id: consultation.id,
    appointmentId: consultation.appointment_id,
    chiefComplaint,
    examination,
    plan,
    outcomeType: consultation.outcome_type,
    completedAt: consultation.completed_at?.toISOString(),
    durationMinutes: consultation.duration_minutes,
    appointment: {
      id: consultation.appointment.id,
      type: consultation.appointment.type,
      appointmentDate: consultation.appointment.appointment_date.toISOString(),
      time: consultation.appointment.time,
      status: consultation.appointment.status,
      patient: {
        id: patient.id,
        firstName: patient.first_name,
        lastName: patient.last_name,
        fileNumber: patient.file_number,
        dateOfBirth: patient.date_of_birth?.toISOString(),
        gender: patient.gender,
        phone: patient.phone,
      },
    },
    hasSurgicalCase: !!consultation.surgical_case,
  };

  // Transform payment data
  let paymentData = null;
  if (payment) {
    const billItems = payment.bill_items.map((item: any) => ({
      id: item.id,
      serviceName: item.service?.service_name || 'Unknown Service',
      quantity: item.quantity,
      unitCost: Number(item.unit_cost),
      totalCost: Number(item.total_cost),
    }));

    paymentData = {
      id: payment.id,
      chargeSheetNo: payment.charge_sheet_no,
      totalAmount: Number(payment.total_amount),
      discount: Number(payment.discount),
      amountPaid: Number(payment.amount_paid),
      status: payment.status,
      finalizedAt: payment.finalized_at?.toISOString(),
      billItems,
    };
  }

  return { ...data, payment: paymentData };
}

export default async function ConsultationDetailPage({ params }: ConsultationDetailPageProps) {
  const { consultationId: consultationIdParam } = await params;
  const user = await getCurrentUser();
  const userId = user?.userId;

  if (!userId) {
    redirect('/login');
  }

  const doctorRecord = await db.doctor.findUnique({
    where: { user_id: userId },
    select: { id: true }
  });

  if (!doctorRecord) {
    redirect('/unauthorized');
  }

  const doctorId = doctorRecord.id;

  const consultationId = parseInt(consultationIdParam);
  if (isNaN(consultationId)) {
    notFound();
  }

  const recordData = await getConsultationRecord(consultationId, doctorId);

  if (!recordData) {
    notFound();
  }

  const patient = recordData.appointment.patient;
  const { payment } = recordData;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderClinicalNote = (title: string, content: string | null | undefined, Icon: any) => {
    const hasContent = content && content.trim().length > 0;
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        </div>
        {hasContent ? (
          <div 
            className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content || '' }}
          />
        ) : (
          <p className="text-sm text-slate-400 italic">No {title.toLowerCase()} recorded</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2 text-slate-500 hover:text-slate-900 -ml-2">
              <Link href="/doctor/consultations">
                <ChevronLeft className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Back to Hub</span>
              </Link>
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">
                Clinical Record
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-bold uppercase h-4 px-1.5 translate-y-[1px]">
                  COMPLETED
                </Badge>
                <span className="text-[10px] text-slate-400 font-medium">
                  Ref: #{recordData.id} • {recordData.appointment.type}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 text-xs font-bold rounded-xl border-slate-200">
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs font-bold rounded-xl border-slate-200">
              <Share2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Patient Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {patient.firstName} {patient.lastName}
                </h2>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                  <span className="font-mono">#{patient.fileNumber || 'N/A'}</span>
                  {patient.gender && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{patient.gender}</span>
                    </>
                  )}
                  {patient.phone && (
                    <>
                      <span>•</span>
                      <span>{patient.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>
          </div>
          
          {/* Appointment Meta */}
          <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>
                {format(new Date(recordData.appointment.appointmentDate), 'MMM d, yyyy')}
                {recordData.appointment.time && ` at ${recordData.appointment.time}`}
              </span>
            </div>
            {recordData.durationMinutes && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>{recordData.durationMinutes} min</span>
              </div>
            )}
            {recordData.completedAt && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Activity className="h-4 w-4 text-slate-400" />
                <span>Completed {format(new Date(recordData.completedAt), 'h:mm a')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Clinical Notes */}
        <div className="grid gap-4">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            Clinical Notes
          </h3>
          
          {renderClinicalNote('Chief Complaint', recordData.chiefComplaint, FileText)}
          {renderClinicalNote('Examination', recordData.examination, Activity)}
          {renderClinicalNote('Plan', recordData.plan, CheckCircle)}
        </div>

        {/* Outcome & Actions */}
        <div className="flex flex-wrap gap-3">
          {recordData.outcomeType && (
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              Outcome: {recordData.outcomeType}
            </Badge>
          )}
          {recordData.hasSurgicalCase && (
            <Badge className="bg-orange-50 text-orange-700 border-orange-200">
              <Scissors className="h-3 w-3 mr-1" />
              Surgical Case
            </Badge>
          )}
          
          {/* Action Buttons */}
          <Link 
            href={`/doctor/appointments/new?patientId=${patient.id}&type=Follow-up&source=DOCTOR_FOLLOW_UP&parentConsultationId=${recordData.id}&parentAppointmentId=${recordData.appointmentId}`}
            className="inline-flex items-center h-7 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Schedule Follow-up
          </Link>
        </div>

        {/* Charge Sheet */}
        {payment ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Charge Sheet</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">{payment.chargeSheetNo}</span>
                <Badge className={
                  payment.status === 'PAID' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : payment.status === 'PART'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }>
                  {payment.status}
                </Badge>
              </div>
            </div>

            <div className="p-5">
              {payment.billItems && payment.billItems.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="text-left pb-3 font-medium">Item</th>
                      <th className="text-center pb-3 font-medium">Qty</th>
                      <th className="text-right pb-3 font-medium">Unit Cost</th>
                      <th className="text-right pb-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payment.billItems.map((item: any, idx: number) => (
                      <tr key={item.id || idx}>
                        <td className="py-3 text-sm text-slate-700">{item.serviceName}</td>
                        <td className="py-3 text-sm text-slate-500 text-center">{item.quantity}</td>
                        <td className="py-3 text-sm text-slate-500 text-right">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="py-3 text-sm text-slate-900 text-right font-medium">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {payment.discount > 0 && (
                      <tr>
                        <td colSpan={3} className="pt-3 text-sm text-slate-500 text-right">Discount</td>
                        <td className="pt-3 text-sm text-rose-600 text-right">-{formatCurrency(payment.discount)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="pt-3 text-base font-semibold text-slate-900 text-right">Total</td>
                      <td className="pt-3 text-base font-bold text-slate-900 text-right">
                        {formatCurrency(payment.totalAmount)}
                      </td>
                    </tr>
                    {payment.amountPaid > 0 && (
                      <tr>
                        <td colSpan={3} className="pt-1 text-sm text-slate-500 text-right">Paid</td>
                        <td className="pt-1 text-sm text-emerald-600 text-right">-{formatCurrency(payment.amountPaid)}</td>
                      </tr>
                    )}
                    {(payment.totalAmount - payment.amountPaid) > 0 && (
                      <tr>
                        <td colSpan={3} className="pt-1 text-sm text-slate-500 text-right">Balance Due</td>
                        <td className="pt-1 text-sm font-semibold text-rose-600 text-right">
                          {formatCurrency(payment.totalAmount - payment.amountPaid)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              ) : (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">No charge sheet items</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800">No Charge Sheet</p>
              <p className="text-xs text-amber-600">No billing was recorded for this consultation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}