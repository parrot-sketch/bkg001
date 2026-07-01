'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  User, 
  Activity, 
  ClipboardList,
  CreditCard,
  Scissors,
  CheckCircle,
  AlertCircle,
  Building2,
  Phone,
  Calendar,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ClinicalNote {
  title: string;
  content: string | null | undefined;
  icon: 'user' | 'activity' | 'clipboard' | 'fileText';
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
  assessment: string;
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

interface ConsultationPrintViewProps {
  recordData: ConsultationRecord;
}

export default function ConsultationPrintView({ recordData }: ConsultationPrintViewProps) {
  const patient = recordData.appointment.patient;

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
    { title: 'Subjective', content: recordData.chiefComplaint, icon: 'user' },
    { title: 'Objective', content: recordData.examination, icon: 'activity' },
    { title: 'Assessment', content: recordData.assessment, icon: 'clipboard' },
    { title: 'Plan', content: recordData.plan, icon: 'fileText' },
  ];

  useEffect(() => {
    // Auto-trigger print dialog when the print view loads
    const timer = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Print Toolbar - hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <Button onClick={handlePrint} className="gap-2 bg-[#272B49] text-white hover:bg-[#3d4360]">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Document Container - optimized for A4/Letter */}
      <div className="max-w-[210mm] mx-auto p-8 print:p-0 print:max-w-none">
        
        {/* Medical Document Header */}
        <div className="border-2 border-slate-800 mb-6">
          {/* Clinic Header */}
          <div className="bg-slate-800 text-white p-6 border-b-2 border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  NAIROBI SCULPT
                </h1>
                <p className="text-slate-300 text-sm mt-1">
                  Aesthetic & Plastic Surgery Center
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Document Type</p>
                <p className="font-semibold text-sm">Consultation Record</p>
              </div>
            </div>
          </div>

          {/* Document Meta */}
          <div className="bg-slate-50 px-6 py-3 flex flex-wrap items-center justify-between text-sm border-b border-slate-200">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Reference No.</p>
                <p className="font-mono font-semibold">CNS-{recordData.id.toString().padStart(6, '0')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Date</p>
                <p className="font-semibold">
                  {format(new Date(recordData.appointment.appointmentDate), 'MMMM d, yyyy')}
                </p>
              </div>
              {recordData.appointment.time && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Time</p>
                  <p className="font-semibold">{recordData.appointment.time}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
              {recordData.durationMinutes && (
                <span className="text-slate-600 text-sm">
                  {recordData.durationMinutes} min
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Patient Information Section */}
        <div className="border-2 border-slate-200 mb-6">
          <div className="bg-slate-100 px-6 py-2 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <User className="h-4 w-4" />
              PATIENT INFORMATION
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Patient Name</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {patient.firstName} {patient.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">File No.</p>
                <p className="font-mono font-semibold text-slate-900 mt-1">
                  {patient.fileNumber || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Gender</p>
                <p className="font-semibold text-slate-900 mt-1 capitalize">
                  {patient.gender || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Age</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {patientAge !== null ? `${patientAge} years` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Phone</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {patient.phone || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Appointment Type</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {recordData.appointment.type}
                </p>
              </div>
              {recordData.outcomeType && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Outcome</p>
                  <p className="font-semibold text-slate-900 mt-1">
                    {recordData.outcomeType.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              {recordData.hasSurgicalCase && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Surgical Case</p>
                  <div className="mt-1">
                    {recordData.isSurgicalPlanComplete ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Plan Complete
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">
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
        <div className="border-2 border-slate-200 mb-6">
          <div className="bg-slate-100 px-6 py-2 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              CLINICAL NOTES
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {clinicalNotes.map((note, index) => (
              <div key={note.title} className={index > 0 ? 'pt-4 border-t border-slate-100' : ''}>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  {note.icon === 'user' && <User className="h-4 w-4" />}
                  {note.icon === 'activity' && <Activity className="h-4 w-4" />}
                  {note.icon === 'clipboard' && <ClipboardList className="h-4 w-4" />}
                  {note.icon === 'fileText' && <FileText className="h-4 w-4" />}
                  {note.title}
                </h3>
                {note.content && note.content.trim().length > 0 ? (
                  <div 
                    className="text-slate-700 leading-relaxed"
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
        {recordData.payment && recordData.payment.billItems && recordData.payment.billItems.length > 0 ? (
          <div className="border-2 border-slate-200 mb-6">
            <div className="bg-slate-100 px-6 py-2 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                CHARGE SHEET
              </h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-600">
                  Charge Sheet No: <span className="font-mono font-semibold">{recordData.payment.chargeSheetNo || 'N/A'}</span>
                </span>
                <Badge className={
                  recordData.payment.status === 'PAID' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : recordData.payment.status === 'PART'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
                }>
                  {recordData.payment.status}
                </Badge>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="text-center py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                    <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                    <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recordData.payment.billItems.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-slate-100">
                      <td className="py-2 text-slate-700">{item.serviceName}</td>
                      <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-600">{formatCurrency(item.unitCost)}</td>
                      <td className="py-2 text-right font-medium text-slate-900">{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {recordData.payment.discount > 0 && (
                    <tr>
                      <td colSpan={3} className="pt-3 text-right text-slate-600">Discount</td>
                      <td className="pt-3 text-right text-rose-600">-{formatCurrency(recordData.payment.discount)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="pt-3 text-right font-semibold text-slate-900">TOTAL</td>
                    <td className="pt-3 text-right font-bold text-lg text-slate-900">{formatCurrency(recordData.payment.totalAmount)}</td>
                  </tr>
                  {recordData.payment.amountPaid > 0 && (
                    <tr>
                      <td colSpan={3} className="pt-1 text-right text-slate-600">Amount Paid</td>
                      <td className="pt-1 text-right text-emerald-600">-{formatCurrency(recordData.payment.amountPaid)}</td>
                    </tr>
                  )}
                  {(recordData.payment.totalAmount - recordData.payment.amountPaid) > 0 && (
                    <tr>
                      <td colSpan={3} className="pt-1 text-right font-semibold text-slate-900">Balance Due</td>
                      <td className="pt-1 text-right font-semibold text-rose-600">{formatCurrency(recordData.payment.totalAmount - recordData.payment.amountPaid)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        ) : recordData.payment ? (
          <div className="border-2 border-amber-200 bg-amber-50 mb-6">
            <div className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">No Items in Charge Sheet</p>
                <p className="text-sm text-amber-600">The charge sheet exists but has no items</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500">
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
          @page {
            margin: 0.5in;
            size: letter;
          }
          body {
            font-size: 12px;
            line-height: 1.4;
            background: white !important;
          }
          div[class*="fixed"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
