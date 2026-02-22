import { ProfileImage } from "@/components/profile-image";
import { format } from "date-fns";
import { Calendar, FileText, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PatientProfileHeroProps {
    patient: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        file_number?: string | null;
        img?: string | null;
        colorCode?: string | null;
        blood_group?: string | null;
        gender?: string | null;
        totalAppointments: number;
        lastVisit?: Date | null;
    };
}

export function PatientProfileHero({ patient }: PatientProfileHeroProps) {
    const fullName = `${patient.first_name} ${patient.last_name}`;

    return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#003b53] via-[#005f73] to-[#0a9396] text-white shadow-lg">
            {/* Subtle dot texture overlay */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage:
                        "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }}
            />

            <div className="relative px-6 py-8 md:px-10 md:py-10">
                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        <div className="ring-4 ring-white/30 rounded-full inline-block">
                            <ProfileImage
                                url={patient.img ?? undefined}
                                name={fullName}
                                className="h-20 w-20 md:h-24 md:w-24 text-2xl"
                                bgColor={patient.colorCode ?? "#0a9396"}
                                textClassName="text-3xl"
                            />
                        </div>
                    </div>

                    {/* Name & identifiers */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight truncate">
                            {fullName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            {patient.file_number && (
                                <div className="flex items-center gap-1.5 text-white/80 text-sm">
                                    <FileText size={14} />
                                    <span className="font-mono">{patient.file_number}</span>
                                </div>
                            )}
                            {patient.gender && (
                                <Badge
                                    variant="outline"
                                    className="border-white/30 text-white/90 bg-white/10 capitalize text-xs"
                                >
                                    {patient.gender.toLowerCase()}
                                </Badge>
                            )}
                            {patient.blood_group && (
                                <Badge
                                    variant="outline"
                                    className="border-white/30 text-white/90 bg-white/10 text-xs"
                                >
                                    {patient.blood_group}
                                </Badge>
                            )}
                        </div>
                        <p className="text-white/60 text-sm mt-1 truncate">{patient.email}</p>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-6 md:gap-8 md:text-right flex-shrink-0">
                        <div>
                            <div className="flex items-center gap-1.5 md:justify-end">
                                <Stethoscope size={14} className="text-white/60" />
                                <p className="text-2xl font-bold text-white">
                                    {patient.totalAppointments}
                                </p>
                            </div>
                            <p className="text-xs text-white/60 mt-0.5">Appointments</p>
                        </div>
                        {patient.lastVisit && (
                            <div>
                                <div className="flex items-center gap-1.5 md:justify-end">
                                    <Calendar size={14} className="text-white/60" />
                                    <p className="text-sm font-semibold text-white">
                                        {format(patient.lastVisit, "MMM d, yyyy")}
                                    </p>
                                </div>
                                <p className="text-xs text-white/60 mt-0.5">Last Visit</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
