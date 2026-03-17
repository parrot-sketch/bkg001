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
            {/* Tab Bar */}
            <div className="flex items-center gap-3 px-4">
                {TABS.map((tab) => {
                    const count = appointments[tab.key].length;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => onTabChange(tab.key)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                                isActive
                                    ? "bg-stone-900 text-white"
                                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                                isActive ? "bg-white/20 text-white" : "bg-stone-200 text-stone-600"
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Filter and Search Row */}
            {activeList.length > 0 && (
                <div className="flex items-center gap-3 px-4">
                    {/* Status Filter Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Filter className="h-3.5 w-3.5 text-stone-400 mr-1" />
                        {STATUS_FILTERS.map((sf) => {
                            const count = sf.value === 'ALL'
                                ? activeList.length
                                : activeList.filter((a) => a.status === sf.value).length;
                            if (sf.value !== 'ALL' && count === 0) return null;
                            const isActive = statusFilter === sf.value;
                            return (
                                <button
                                    key={sf.value}
                                    onClick={() => onStatusFilterChange(sf.value)}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-[11px] font-medium border transition-all",
                                        isActive
                                            ? "bg-stone-800 text-white border-stone-800"
                                            : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                                    )}
                                >
                                    {sf.label}
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Search */}
                    <div className="relative ml-auto">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-8 h-8 text-xs bg-white border-stone-200 rounded-md w-40"
                        />
                    </div>
                </div>
            )}

            {/* Appointment List */}
            {filteredList.length > 0 ? (
                <div className="space-y-1 border border-stone-100 rounded-lg bg-white/50 overflow-hidden mx-4">
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
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-dashed border-stone-200 mx-4">
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center mb-3">
                        <Calendar className="h-4 w-4 text-stone-300" />
                    </div>
                    <h3 className="text-sm font-medium text-stone-600">
                        {searchQuery ? 'No matching appointments' : `No ${activeTab} appointments`}
                    </h3>
                    <p className="text-xs text-stone-400 max-w-xs text-center mt-1">
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
