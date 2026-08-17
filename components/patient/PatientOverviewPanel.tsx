"use client";

import {
    User,
    Calendar,
    Phone,
    Heart,
    Droplets,
    MapPin,
    AlertCircle,
    PhoneCall,
    Users,
    Mail,
    Briefcase,
    Stethoscope,
    UserPlus,
    CalendarPlus,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { BookingChannel } from "@/domain/enums/BookingChannel";
import { AppointmentSource } from "@/domain/enums/AppointmentSource";
import { useBookAppointmentStore } from "@/hooks/frontdesk/useBookAppointmentStore";
import { QuickAssignmentDialog } from "@/components/frontdesk/QuickAssignmentDialog";

interface PatientOverviewPanelProps {
    patient: {
        gender?: string | null;
        date_of_birth?: Date | null;
        phone?: string | null;
        email?: string | null;
        whatsapp_phone?: string | null;
        marital_status?: string | null;
        occupation?: string | null;
        referral_source?: string | null;
        blood_group?: string | null;
        address?: string | null;
        emergency_contact_name?: string | null;
        emergency_contact_number?: string | null;
        relation?: string | null;
        allergies?: string | null;
        medical_conditions?: string | null;
        medical_history?: string | null;
    };
    patientId: string;
    patientName: string;
}

interface FieldRowProps {
    label: string;
    value?: string | null;
    icon?: React.ReactNode;
}

function FieldRow({ label, value, icon }: FieldRowProps) {
    const displayValue = value || (
        <span className="text-[#2c2e4b]/30 italic">Not provided</span>
    );

    return (
        <div className="flex items-start gap-4 py-3 border-b border-[#e7d6bf]/60 last:border-0">
            {icon && (
                <div className="flex-shrink-0 mt-0.5 text-[#caa26a]">
                    {icon}
                </div>
            )}
            <div className="flex-1 min-w-0 grid grid-cols-[140px_1fr] gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2c2e4b]/60 truncate">
                    {label}
                </span>
                <span className="text-sm text-[#2c2e4b] break-words">
                    {displayValue}
                </span>
            </div>
        </div>
    );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="flex items-center gap-2 pb-3 border-b border-[#e7d6bf]">
            <div className="text-[#caa26a]">{icon}</div>
            <h2 className="text-xs font-bold text-[#2c2e4b] uppercase tracking-wider">{title}</h2>
        </div>
    );
}

function CtaButton({ icon: Icon, label, description, onClick, variant = 'default' }: {
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
    description: string;
    onClick?: () => void;
    variant?: 'default' | 'outline';
}) {
    const baseClass = "flex items-center gap-3 px-4 py-3 border transition-colors text-left";
    const variantClass = variant === 'outline'
        ? "border-[#e7d6bf] hover:bg-[#e7d6bf]/10"
        : "border-[#caa26a] bg-[#caa26a]/5 hover:bg-[#caa26a]/10";

    return (
        <button onClick={onClick} className={cn(baseClass, variantClass)}>
            <div className={cn("p-2 rounded-md", variant === 'outline' ? "bg-[#e7d6bf]/20 text-[#caa26a]" : "bg-[#caa26a]/10 text-[#caa26a]")}>
                <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2c2e4b] leading-tight">{label}</p>
                <p className="text-[11px] text-[#2c2e4b]/50 mt-0.5">{description}</p>
            </div>
        </button>
    );
}

export function PatientOverviewPanel({ patient, patientId, patientName }: PatientOverviewPanelProps) {
    const [queueDialogOpen, setQueueDialogOpen] = useState(false);
    const { openBookingDialog } = useBookAppointmentStore();

    const dob = patient.date_of_birth
        ? format(patient.date_of_birth, "MMMM d, yyyy")
        : null;

    return (
        <div className="space-y-4">
            <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/5">
                    <SectionHeader icon={<User size={14} />} title="Personal Information" />
                </div>
                <div className="px-5">
                    <FieldRow label="Gender" value={patient.gender?.toLowerCase()} icon={<User size={14} />} />
                    <FieldRow label="Date of Birth" value={dob} icon={<Calendar size={14} />} />
                    <FieldRow label="Phone" value={patient.phone} icon={<Phone size={14} />} />
                    <FieldRow label="Email" value={patient.email} icon={<Mail size={14} />} />
                    <FieldRow label="WhatsApp" value={patient.whatsapp_phone} icon={<PhoneCall size={14} />} />
                    <FieldRow label="Blood Group" value={patient.blood_group} icon={<Droplets size={14} />} />
                    <FieldRow label="Occupation" value={patient.occupation} icon={<Briefcase size={14} />} />
                    <FieldRow label="Referral Source" value={patient.referral_source?.replace(/_/g, ' ').toLowerCase()} icon={<Users size={14} />} />
                    <FieldRow label="Address" value={patient.address} icon={<MapPin size={14} />} />
                </div>
            </div>

            <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/5">
                    <SectionHeader icon={<AlertCircle size={14} />} title="Emergency Contact" />
                </div>
                <div className="px-5">
                    <FieldRow label="Contact Person" value={patient.emergency_contact_name} icon={<Users size={14} />} />
                    <FieldRow label="Contact Number" value={patient.emergency_contact_number} icon={<PhoneCall size={14} />} />
                    <FieldRow label="Relationship" value={patient.relation?.toLowerCase()} icon={<Heart size={14} />} />
                </div>
            </div>

            <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#e7d6bf] bg-[#e7d6bf]/5">
                    <SectionHeader icon={<Stethoscope size={14} />} title="Medical Overview" />
                </div>
                <div className="px-5">
                    <FieldRow label="Allergies" value={patient.allergies} icon={<AlertCircle size={14} />} />
                    <FieldRow label="Medical Conditions" value={patient.medical_conditions} icon={<Heart size={14} />} />
                    <FieldRow label="Medical History" value={patient.medical_history} icon={<Stethoscope size={14} />} />
                </div>
            </div>

            <div className="bg-white/95 backdrop-blur border border-[#e7d6bf] rounded-xl p-4">
                <div className="flex flex-wrap gap-3">
                    <CtaButton
                        icon={UserPlus}
                        label="Add to Queue"
                        description="Assign to a doctor"
                        onClick={() => setQueueDialogOpen(true)}
                    />
                    <CtaButton
                        icon={CalendarPlus}
                        label="Schedule Appointment"
                        description="Book a new appointment"
                        onClick={() => openBookingDialog({
                            initialPatientId: patientId,
                            source: AppointmentSource.FRONTDESK_SCHEDULED,
                            bookingChannel: BookingChannel.DASHBOARD,
                        })}
                    />
                </div>
            </div>

            <QuickAssignmentDialog
                open={queueDialogOpen}
                onOpenChange={setQueueDialogOpen}
                initialPatientId={patientId}
                initialPatientName={patientName}
            />
        </div>
    );
}
