"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
    { key: "overview", label: "Overview" },
    { key: "appointments", label: "Appointments" },
    { key: "billing", label: "Billing & Payments" },
];

interface PatientProfileTabsProps {
    patientId: string;
    containerClassName?: string;
    activeClassName?: string;
    inactiveClassName?: string;
}

export function PatientProfileTabs({
    patientId,
    containerClassName,
    activeClassName,
    inactiveClassName,
}: PatientProfileTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCat = searchParams.get("cat") || "overview";

    const handleTabClick = (key: string) => {
        router.push(`/frontdesk/patient/${patientId}?cat=${key}`, { scroll: false });
    };

    return (
        <div className={cn("border-b border-border bg-white", containerClassName)}>
            <nav className="flex gap-0 px-6 overflow-x-auto scrollbar-hide" aria-label="Patient profile sections">
                {TABS.map((tab) => {
                    const isActive = currentCat === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => handleTabClick(tab.key)}
                            className={cn(
                                "relative px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none",
                                isActive
                                    ? (activeClassName || "text-primary border-b-2 border-primary")
                                    : (inactiveClassName || "text-muted-foreground hover:text-foreground hover:bg-muted/40")
                            )}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
