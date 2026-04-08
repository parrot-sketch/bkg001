'use client';

import { format } from 'date-fns';
import { 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  Activity, 
  CreditCard,
  CheckCircle,
  Scissors,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConsultationRecordData {
  id: number;
  appointmentId: number;
  chiefComplaint?: string | null;
  examination?: string | null;
  plan?: string | null;
  outcomeType?: string | null;
  completedAt?: string | null;
  durationMinutes?: number | null;
  appointment?: {
    id: number;
    type: string;
    appointmentDate: string;
    time?: string | null;
    status: string;
    patient?: {
      id: string;
      firstName: string;
      lastName: string;
      fileNumber?: string;
      dateOfBirth?: string;
      gender?: string;
      phone?: string;
    };
  };
  payment?: {
    id: number;
    chargeSheetNo: string;
    totalAmount: number;
    discount: number;
    amountPaid: number;
    status: string;
    finalizedAt?: string | null;
    billItems: Array<{
      id: number;
      serviceName: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>;
  };
  hasSurgicalCase?: boolean;
}

interface ConsultationRecordProps {
  data: ConsultationRecordData;
}

export function ConsultationRecord({ data }: ConsultationRecordProps) {
  const { appointment, payment } = data;
  const patient = appointment?.patient;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderClinicalNote = (title: string, content: string | null | undefined, icon: React.ReactNode) => {
    const hasContent = content && content.trim().length > 0;
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-400">{icon}</span>
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Patient Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
              {patient?.firstName?.[0]}{patient?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {patient?.firstName} {patient?.lastName}
              </h2>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span className="font-mono">#{patient?.fileNumber || 'N/A'}</span>
                {patient?.gender && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{patient.gender}</span>
                  </>
                )}
                {patient?.phone && (
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
            <p className="text-xs text-slate-400 mt-2">
              Ref: #{data.id} • {appointment?.type}
            </p>
          </div>
        </div>
        
        {/* Appointment Meta */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>
              {appointment?.appointmentDate 
                ? format(new Date(appointment.appointmentDate), 'MMM d, yyyy')
                : 'N/A'}
              {appointment?.time && ` at ${appointment.time}`}
            </span>
          </div>
          {data.durationMinutes && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{data.durationMinutes} minutes</span>
            </div>
          )}
          {data.completedAt && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Activity className="h-4 w-4 text-slate-400" />
              <span>Completed {format(new Date(data.completedAt), 'h:mm a')}</span>
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
        
        {renderClinicalNote('Chief Complaint', data.chiefComplaint, <FileText className="h-4 w-4" />)}
        {renderClinicalNote('Examination', data.examination, <Activity className="h-4 w-4" />)}
        {renderClinicalNote('Plan', data.plan, <CheckCircle className="h-4 w-4" />)}
      </div>

      {/* Outcome & Actions */}
      <div className="flex flex-wrap gap-3">
        {data.outcomeType && (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
            Outcome: {data.outcomeType}
          </Badge>
        )}
        {data.hasSurgicalCase && (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200">
            <Scissors className="h-3 w-3 mr-1" />
            Surgical Case
          </Badge>
        )}
      </div>

      {/* Charge Sheet */}
      {payment && (
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
                  : payment.status === 'PARTIAL'
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
                  {payment.billItems.map((item, idx) => (
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
      )}

      {!payment && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800">No Charge Sheet</p>
            <p className="text-xs text-amber-600">No billing was recorded for this consultation</p>
          </div>
        </div>
      )}
    </div>
  );
}