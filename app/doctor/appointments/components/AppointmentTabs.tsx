'use client';

import { Calendar, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { AppointmentRow } from './AppointmentRow';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

type TabKey = 'today' | 'upcoming' | 'past';

interface AppointmentTabsProps {
    activeTab: TabKey;
    onTabChange: (tab: TabKey) => void;
    statusFilter: string;
    onStatusFilterChange: (filter: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    appointments: {
        today: AppointmentResponseDto[];
        upcoming: AppointmentResponseDto[];
        past: AppointmentResponseDto[];
    };
    filteredList: AppointmentResponseDto[];
    onCheckIn: (id: number) => void;
    onStartConsultation: (apt: AppointmentResponseDto) => void;
    onCompleteConsultation: (apt: AppointmentResponseDto) => void;
}

const TABS: { key: TabKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
];

const STATUS_FILTERS = [
    { value: 'ALL', label: 'All' },
    { value: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION, label: 'Needs Confirm' },
    { value: AppointmentStatus.SCHEDULED, label: 'Scheduled' },
    { value: AppointmentStatus.CHECKED_IN, label: 'Checked In' },
    { value: AppointmentStatus.IN_CONSULTATION, label: 'In Consult' },
    { value: AppointmentStatus.COMPLETED, label: 'Completed' },
];

export function AppointmentTabs({
    activeTab,
    onTabChange,
    statusFilter,
    onStatusFilterChange,
    searchQuery,
    onSearchChange,
    appointments,
    filteredList,
    onCheckIn,
    onStartConsultation,
    onCompleteConsultation,
}: AppointmentTabsProps) {
    const activeList = appointments[activeTab];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/50 rounded-t-xl border-b border-slate-100">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <h3 className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest">Appointments</h3>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 w-fit ml-4">
                {TABS.map((tab) => {
                    const count = appointments[tab.key].length;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
                                activeTab === tab.key
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                activeTab === tab.key ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Status Filter Chips */}
            {activeList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap px-4">
                    <Filter className="h-3.5 w-3.5 text-slate-400 mr-1" />
                    {STATUS_FILTERS.map((sf) => {
                        const count = sf.value === 'ALL'
                            ? activeList.length
                            : activeList.filter((a) => a.status === sf.value).length;
                        if (sf.value !== 'ALL' && count === 0) return null;
                        return (
                            <button
                                key={sf.value}
                                onClick={() => onStatusFilterChange(sf.value)}
                                className={cn(
                                    "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                                    statusFilter === sf.value
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                )}
                            >
                                {sf.label} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Search */}
            {activeList.length > 0 && (
                <div className="relative max-w-xs ml-4">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                        placeholder="Search patient or type..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg"
                    />
                </div>
            )}

            {/* Appointment List */}
            {filteredList.length > 0 ? (
                <div className="space-y-2">
                    {filteredList.map((appointment) => (
                        <AppointmentRow
                            key={appointment.id}
                            appointment={appointment}
                            onCheckIn={onCheckIn}
                            onStartConsultation={onStartConsultation}
                            onCompleteConsultation={onCompleteConsultation}
                            showDate={activeTab !== 'today'}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 bg-white rounded-xl border border-dashed border-slate-200 mx-4">
                    <Calendar className="h-6 w-6 text-slate-300 mb-2" />
                    <h3 className="text-sm font-semibold text-slate-700">
                        {searchQuery ? 'No matching appointments' : `No ${activeTab} appointments`}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs text-center mt-1">
                        {searchQuery
                            ? 'Try adjusting your search or filter criteria.'
                            : activeTab === 'today'
                                ? 'Your schedule is clear for today.'
                                : activeTab === 'upcoming'
                                    ? 'No upcoming appointments scheduled.'
                                    : 'No past appointments found.'
                        }
                    </p>
                </div>
            )}
        </div>
    );
}
