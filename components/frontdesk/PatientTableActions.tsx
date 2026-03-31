'use client';

/**
 * PatientTableActions Component
 * 
 * Enhanced action menu for patient list table with:
 * - Dropdown menu with all actions
 * - Direct queue assignment via QuickAssignmentDialog
 * - Smooth transitions and modern UI
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  UserPlus,
  CreditCard,
  ClipboardList,
  Mail,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { useBookAppointmentStore } from '@/hooks/frontdesk/useBookAppointmentStore';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';
import { QuickAssignmentDialog } from '@/components/frontdesk/QuickAssignmentDialog';

interface PatientTableActionsProps {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
  };
  onActionComplete?: () => void;
}

export function PatientTableActions({ patient, onActionComplete }: PatientTableActionsProps) {
  const router = useRouter();
  const { openBookingDialog } = useBookAppointmentStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickAssignmentOpen, setQuickAssignmentOpen] = useState(false);

  const patientName = `${patient.firstName} ${patient.lastName}`;

  // Inline action handlers
  const handleBook = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    openBookingDialog({
      initialPatientId: patient.id,
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.PATIENT_LIST,
    });
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setQuickAssignmentOpen(true);
  };

  // Dropdown action handlers
  const handleViewBilling = () => {
    setMenuOpen(false);
    router.push(`/frontdesk/patient/${patient.id}?tab=billing`);
  };

  const handleViewAppointments = () => {
    setMenuOpen(false);
    router.push(`/frontdesk/patient/${patient.id}?tab=appointments`);
  };

  const handleEmailPatient = () => {
    setMenuOpen(false);
    if (patient.email) {
      window.open(`mailto:${patient.email}`, '_blank');
    }
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    router.push(`/frontdesk/patient/${patient.id}`);
  };

  const handleQuickAssignmentSuccess = () => {
    setQuickAssignmentOpen(false);
    onActionComplete?.();
  };

  return (
    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      {/* Dropdown Menu - All actions consolidated */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs rounded-lg hover:bg-slate-100 transition-all duration-200 ease-in-out"
            onClick={(e) => e.stopPropagation()}
            title="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Primary Action: Add to Queue */}
          <DropdownMenuItem onClick={handleAddToQueue} className="cursor-pointer focus:bg-cyan-50 focus:text-cyan-700">
            <UserPlus className="h-4 w-4 mr-2 text-cyan-600" />
            Add to Queue
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Secondary Actions */}
          <DropdownMenuItem onClick={handleBook} className="cursor-pointer focus:bg-slate-50">
            <Calendar className="h-4 w-4 mr-2 text-slate-500" />
            Book Appointment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewBilling} className="cursor-pointer focus:bg-slate-50">
            <CreditCard className="h-4 w-4 mr-2 text-slate-500" />
            View Billing
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewAppointments} className="cursor-pointer focus:bg-slate-50">
            <ClipboardList className="h-4 w-4 mr-2 text-slate-500" />
            View Appointments
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleEmailPatient} 
            disabled={!patient.email}
            className="cursor-pointer focus:bg-slate-50"
          >
            <Mail className="h-4 w-4 mr-2 text-slate-500" />
            Email Patient
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* View Action */}
          <DropdownMenuItem onClick={handleViewProfile} className="cursor-pointer focus:bg-slate-50">
            <Eye className="h-4 w-4 mr-2 text-slate-500" />
            View Full Profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Assignment Dialog */}
      <QuickAssignmentDialog
        open={quickAssignmentOpen}
        onOpenChange={setQuickAssignmentOpen}
        onSuccess={handleQuickAssignmentSuccess}
        initialPatientId={patient.id}
        initialPatientName={patientName}
      />
    </div>
  );
}
