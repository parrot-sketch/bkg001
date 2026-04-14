'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChargeSheet } from '@/components/charge-sheet';
import { 
  ChevronLeft, 
  FileText, 
  CreditCard, 
  Calendar, 
  Clock, 
  Activity, 
  CheckCircle, 
  Scissors, 
  Download, 
  User,
  AlertCircle,
  Stethoscope,
  ClipboardList,
  Printer,
  Building2,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ClinicalNote {
  title: string;
  content: string | null | undefined;
}

interface ChargeItem {
  id: number;
  serviceName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface PaymentData {
  id: number;
  chargeSheetNo: string | null;
  totalAmount: number;
  discount: number;
  amountPaid: number;
  status: string;
  finalizedAt?: string;
  billItems: ChargeItem[];
}

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  fileNumber: string | null;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
}

interface AppointmentData {
  id: number;
  type: string;
  appointmentDate: string;
  time?: string;
  status: string;
  patient: PatientData;
}

interface ConsultationRecord {
  id: number;
  appointmentId: number;
  chiefComplaint: string;
  examination: string;
  plan: string;
  outcomeType?: string;
  completedAt?: string;
  durationMinutes?: number;
  surgicalCaseId?: string;
  isSurgicalPlanComplete?: boolean;
  appointment: AppointmentData;
  hasSurgicalCase: boolean;
  payment: PaymentData | null;
}

interface ConsultationDetailPageContentProps {
  recordData: ConsultationRecord;
}

export default function ConsultationDetailPageContent({ recordData }: ConsultationDetailPageContentProps) {
  const patient = recordData.appointment.patient;
  const { payment } = recordData;
  const [isEditingBilling, setIsEditingBilling] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const patientAge = calculateAge(patient.dateOfBirth);

  const clinicalNotes: ClinicalNote[] = [
    { title: 'Chief Complaint / Patient Concerns', content: recordData.chiefComplaint },
    { title: 'Clinical Examination', content: recordData.examination },
    { title: 'Treatment Plan & Recommendations', content: recordData.plan },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print-optimized header */}
      <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2 text-slate-500 hover:text-slate-900">
              <Link href="/doctor/consultations">
                <ChevronLeft className="h-5 w-5 mr-1" />
                <span className="hidden sm:inline">Back to Hub</span>
              </Link>
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <span className="text-sm font-medium text-slate-600">Consultation Record</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document Container */}
      <div className="max-w-4xl mx-auto p-6 sm:p-8 print:p-0">
        
        {/* Medical Document Header */}
        <div className="border-2 border-slate-800 mb-8 print:border-black">
          {/* Clinic Header */}
          <div className="bg-slate-800 text-white p-4 sm:p-6 print:bg-white print:text-black print:border-b-2 print:border-black">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  NAIROBI SCULPT
                </h1>
                <p className="text-slate-300 text-sm print:text-black mt-1">
                  Aesthetic & Plastic Surgery Center
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 print:text-black">Document Type</p>
                <p className="font-semibold text-sm">Consultation Record</p>
              </div>
            </div>
          </div>

          {/* Document Meta */}
          <div className="bg-slate-50 print:bg-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between text-sm border-b border-slate-200 print:border-black">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-slate-500 print:text-black">Reference No.</p>
                <p className="font-mono font-semibold">CNS-{recordData.id.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 print:text-black">Date</p>
                <p className="font-semibold">
                  {format(new Date(recordData.appointment.appointmentDate), 'MMMM d, yyyy')}
                </p>
              </div>
              {recordData.appointment.time && (
                <div>
                  <p className="text-xs text-slate-500 print:text-black">Time</p>
                  <p className="font-semibold">{recordData.appointment.time}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 print:border print:bg-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
              {recordData.durationMinutes && (
                <span className="text-slate-500 text-sm print:text-black">
                  {recordData.durationMinutes} min
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Patient Information Section */}
        <div className="border-2 border-slate-200 mb-8 print:border-black">
          <div className="bg-slate-100 print:bg-white px-4 sm:px-6 py-2 border-b border-slate-200 print:border-black">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 print:text-black">
              <User className="h-4 w-4" />
              PATIENT INFORMATION
            </h2>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">Patient Name</p>
                <p className="font-semibold text-slate-900 mt-1 print:text-black">
                  {patient.firstName} {patient.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">File No.</p>
                <p className="font-mono font-semibold text-slate-900 mt-1 print:text-black">
                  {patient.fileNumber || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">Gender</p>
                <p className="font-semibold text-slate-900 mt-1 capitalize print:text-black">
                  {patient.gender || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">Age</p>
                <p className="font-semibold text-slate-900 mt-1 print:text-black">
                  {patientAge !== null ? `${patientAge} years` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">Phone</p>
                <p className="font-semibold text-slate-900 mt-1 print:text-black">
                  {patient.phone || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">Appointment Type</p>
                <p className="font-semibold text-slate-900 mt-1 print:text-black">
                  {recordData.appointment.type}
                </p>
              </div>
              {recordData.outcomeType && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">Outcome</p>
                  <p className="font-semibold text-slate-900 mt-1 print:text-black">
                    {recordData.outcomeType.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              {recordData.hasSurgicalCase && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider print:text-black">Surgical Case</p>
                  <div className="mt-1">
                    {recordData.isSurgicalPlanComplete ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 print:bg-white print:border">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Plan Complete
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200 print:bg-white print:border">
                        <Scissors className="h-3 w-3 mr-1" />
                        Plan Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Notes Section */}
        <div className="border-2 border-slate-200 mb-8 print:border-black">
          <div className="bg-slate-100 print:bg-white px-4 sm:px-6 py-2 border-b border-slate-200 print:border-black">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 print:text-black">
              <FileText className="h-4 w-4" />
              CLINICAL NOTES
            </h2>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            {clinicalNotes.map((note, index) => (
              <div key={note.title} className={index > 0 ? 'pt-4 border-t border-slate-100 print:border-black' : ''}>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2 print:text-black">
                  {index === 0 && <Stethoscope className="h-4 w-4" />}
                  {index === 1 && <Activity className="h-4 w-4" />}
                  {index === 2 && <ClipboardList className="h-4 w-4" />}
                  {note.title}
                </h3>
                {note.content && note.content.trim().length > 0 ? (
                  <div 
                    className="text-slate-700 leading-relaxed print:text-black"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                ) : (
                  <p className="text-slate-400 italic">No documentation recorded</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Charge Sheet Section */}
        {isEditingBilling ? (
          <div className="border-2 border-slate-200 mb-8 print:hidden">
            <div className="bg-slate-100 px-4 sm:px-6 py-2 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  CHARGE SHEET (Edit Mode)
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingBilling(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <ChargeSheet 
                appointmentId={recordData.appointmentId}
              />
            </div>
          </div>
        ) : (
          <>
            {payment && payment.billItems && payment.billItems.length > 0 && (
              <div className="border-2 border-slate-200 mb-8 print:border-black">
                <div className="bg-slate-100 print:bg-white px-4 sm:px-6 py-2 border-b border-slate-200 print:border-black">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2 print:text-black">
                      <CreditCard className="h-4 w-4" />
                      CHARGE SHEET
                    </h2>
                    <Button variant="outline" size="sm" onClick={() => setIsEditingBilling(true)}>
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-500 print:text-black">
                      Charge Sheet No: <span className="font-mono font-semibold">{payment.chargeSheetNo || 'N/A'}</span>
                    </span>
                    <Badge className={
                      payment.status === 'PAID' 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : payment.status === 'PART'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-800 border-slate-200'
                    }>
                      {payment.status}
                    </Badge>
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 print:border-black">
                        <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider print:text-black">Item</th>
                        <th className="text-center py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider print:text-black">Qty</th>
                        <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider print:text-black">Unit Price</th>
                        <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider print:text-black">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payment.billItems.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b border-slate-100 print:border-black">
                          <td className="py-2 text-slate-700 print:text-black">{item.serviceName}</td>
                          <td className="py-2 text-center text-slate-600 print:text-black">{item.quantity}</td>
                          <td className="py-2 text-right text-slate-600 print:text-black">{formatCurrency(item.unitCost)}</td>
                          <td className="py-2 text-right font-medium text-slate-900 print:text-black">{formatCurrency(item.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {payment.discount > 0 && (
                        <tr>
                          <td colSpan={3} className="pt-3 text-right text-slate-500 print:text-black">Discount</td>
                          <td className="pt-3 text-right text-rose-600">-{formatCurrency(payment.discount)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-slate-200 print:border-black">
                        <td colSpan={3} className="pt-3 text-right font-semibold text-slate-900 print:text-black">TOTAL</td>
                        <td className="pt-3 text-right font-bold text-lg text-slate-900 print:text-black">{formatCurrency(payment.totalAmount)}</td>
                      </tr>
                      {payment.amountPaid > 0 && (
                        <tr>
                          <td colSpan={3} className="pt-1 text-right text-slate-500 print:text-black">Amount Paid</td>
                          <td className="pt-1 text-right text-emerald-600">-{formatCurrency(payment.amountPaid)}</td>
                        </tr>
                      )}
                      {(payment.totalAmount - payment.amountPaid) > 0 && (
                        <tr>
                          <td colSpan={3} className="pt-1 text-right font-semibold text-slate-900 print:text-black">Balance Due</td>
                          <td className="pt-1 text-right font-semibold text-rose-600 print:text-black">{formatCurrency(payment.totalAmount - payment.amountPaid)}</td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

          </>
        )}

        {/* No Charge Sheet - Add Button */}
        {(!payment || !payment.billItems || payment.billItems.length === 0) && !isEditingBilling && (
          <div className="border-2 border-amber-200 bg-amber-50 mb-8 print:border-black print:bg-white">
            <div className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 print:text-black">No Charge Sheet</p>
                <p className="text-sm text-amber-600 print:text-black">No billing was recorded for this consultation</p>
              </div>
              <Button onClick={() => setIsEditingBilling(true)}>
                Add Charge Sheet
              </Button>
            </div>
          </div>
        )}

        {/* Surgical Plan Actions */}
        {recordData.hasSurgicalCase && recordData.surgicalCaseId && (
          <div className="border-2 border-slate-200 mb-8 print:border-black">
            <div className="bg-slate-100 print:bg-white px-4 sm:px-6 py-2 border-b border-slate-200 print:border-black">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 print:text-black">
                <Scissors className="h-4 w-4" />
                SURGICAL CASE
              </h2>
            </div>
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/doctor/surgical-cases/${recordData.surgicalCaseId}/plan`}
                  className={cn(
                    "inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg",
                    recordData.isSurgicalPlanComplete
                      ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  )}
                >
                  {recordData.isSurgicalPlanComplete ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      View Plan
                    </>
                  ) : (
                    <>
                      <ClipboardList className="h-4 w-4 mr-2" />
                      {recordData.isSurgicalPlanComplete ? 'View Plan' : 'Complete Plan'}
                    </>
                  )}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Hidden on Print */}
        <div className="print:hidden flex flex-wrap gap-3 justify-end pt-4 border-t border-slate-200">
          <Link 
            href={`/doctor/appointments/new?patientId=${patient.id}&type=Follow-up&source=DOCTOR_FOLLOW_UP&parentConsultationId=${recordData.id}&parentAppointmentId=${recordData.appointmentId}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Follow-up
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 print:border-black">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 print:text-black">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Nairobi Sculpt Medical Center
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                +254 700 000 000
              </span>
            </div>
            <p>Generated on {format(new Date(), 'PPpp')}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { 
            font-size: 12px; 
            line-height: 1.4;
          }
          .print\\:hidden { 
            display: none !important; 
          }
          .print\\:border-black {
            border-color: #000 !important;
          }
          .print\\:text-black {
            color: #000 !important;
          }
          .print\\:bg-white {
            background-color: #fff !important;
          }
          @page {
            margin: 0.5in;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}
