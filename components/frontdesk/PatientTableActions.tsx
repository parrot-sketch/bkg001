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
    router.push(`/frontdesk/patient/${patient.id}?cat=billing`);
  };

  const handleViewAppointments = () => {
    setMenuOpen(false);
    router.push(`/frontdesk/patient/${patient.id}?cat=appointments`);
  };

  const handleViewProfile = () => {
    setMenuOpen(false);
    router.push(`/frontdesk/patient/${patient.id}?cat=overview`);
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
            className="h-8 px-2 text-xs rounded-lg hover:bg-[#e7d6bf]/30 transition-all duration-200 ease-in-out text-[#2c2e4b]"
            onClick={(e) => e.stopPropagation()}
            title="Actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56 z-[60]">
          {/* Primary Action: Add to Queue */}
          <DropdownMenuItem
            onClick={handleAddToQueue}
            className="cursor-pointer data-[highlighted]:bg-[#e7d6bf]/20 data-[highlighted]:text-[#2c2e4b]"
          >
            <UserPlus className="h-4 w-4 mr-2 text-[#caa26a]" />
            Add to Queue
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Secondary Actions */}
          <DropdownMenuItem
            onClick={handleBook}
            className="cursor-pointer data-[highlighted]:bg-[#e7d6bf]/20 data-[highlighted]:text-[#2c2e4b]"
          >
            <Calendar className="h-4 w-4 mr-2 text-[#2c2e4b]/50" />
            Book Appointment
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleViewBilling}
            className="cursor-pointer data-[highlighted]:bg-[#e7d6bf]/20 data-[highlighted]:text-[#2c2e4b]"
          >
            <CreditCard className="h-4 w-4 mr-2 text-[#2c2e4b]/50" />
            View Billing
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleViewAppointments}
            className="cursor-pointer data-[highlighted]:bg-[#e7d6bf]/20 data-[highlighted]:text-[#2c2e4b]"
          >
            <ClipboardList className="h-4 w-4 mr-2 text-[#2c2e4b]/50" />
            View Appointments
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* View Action */}
          <DropdownMenuItem
            onClick={handleViewProfile}
            className="cursor-pointer data-[highlighted]:bg-[#e7d6bf]/20 data-[highlighted]:text-[#2c2e4b]"
          >
            <Eye className="h-4 w-4 mr-2 text-[#2c2e4b]/50" />
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
