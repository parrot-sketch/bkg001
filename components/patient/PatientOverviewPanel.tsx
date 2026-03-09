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
    Eye,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PatientOverviewPanelProps {
    patient: {
        gender?: string | null;
        date_of_birth?: Date | null;
        phone?: string | null;
        marital_status?: string | null;
        blood_group?: string | null;
        address?: string | null;
        emergency_contact_name?: string | null;
        emergency_contact_number?: string | null;
        relation?: string | null;

    };
}

interface InfoFieldProps {
    icon: React.ReactNode;
    label: string;
    value?: string | null;
    className?: string;
}

function InfoField({ icon, label, value, className }: InfoFieldProps) {
    return (
        <div className={cn("flex items-start gap-3 p-4 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors", className)}>
            <div className="flex-shrink-0 mt-0.5 text-primary/70">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                    {label}
                </p>
                <p className="text-sm font-medium text-foreground capitalize truncate">
                    {value || (
                        <span className="text-muted-foreground italic font-normal">Not provided</span>
                    )}
                </p>
            </div>
        </div>
    );
}

export function PatientOverviewPanel({ patient }: PatientOverviewPanelProps) {
    const [isRevealed, setIsRevealed] = useState(false);

    const dob = patient.date_of_birth
        ? format(patient.date_of_birth, "MMMM d, yyyy")
        : null;

    return (
        <div className="space-y-6">
            {/* Personal Information */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <User size={16} className="text-primary" />
                    <h2 className="text-base font-semibold text-foreground">Personal Information</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    <InfoField
                        icon={<User size={16} />}
                        label="Gender"
                        value={patient.gender?.toLowerCase()}
                    />
                    <InfoField
                        icon={<Calendar size={16} />}
                        label="Date of Birth"
                        value={dob}
                    />
                    <InfoField
                        icon={<Phone size={16} />}
                        label="Phone Number"
                        value={patient.phone}
                    />
                    <InfoField
                        icon={<Droplets size={16} />}
                        label="Blood Group"
                        value={patient.blood_group}
                    />
                    <InfoField
                        icon={<MapPin size={16} />}
                        label="Address"
                        value={patient.address}
                        className="sm:col-span-2 xl:col-span-1"
                    />
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Emergency Contact */}
            <div className="relative group">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-destructive/70" />
                        <h2 className="text-base font-semibold text-foreground">Emergency Contact</h2>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-transparent transition-all duration-300">
                    <div className={cn(
                        "grid grid-cols-1 sm:grid-cols-3 gap-3 transition-all duration-500",
                        !isRevealed && "blur-md select-none opacity-40 grayscale"
                    )}>
                        <InfoField
                            icon={<Users size={16} />}
                            label="Contact Person"
                            value={patient.emergency_contact_name}
                        />
                        <InfoField
                            icon={<PhoneCall size={16} />}
                            label="Contact Number"
                            value={patient.emergency_contact_number}
                        />
                        <InfoField
                            icon={<Heart size={16} />}
                            label="Relationship"
                            value={patient.relation}
                        />
                    </div>

                    {!isRevealed && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <button
                                onClick={() => setIsRevealed(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-border/50 text-sm font-semibold text-foreground hover:bg-white hover:scale-105 transition-all duration-300 active:scale-95 group/btn"
                            >
                                <Eye size={16} className="text-primary group-hover/btn:scale-110 transition-transform" />
                                <span>Reveal Contact Details</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
