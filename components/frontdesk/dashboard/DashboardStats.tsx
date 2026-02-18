/**
 * DashboardStats Component
 * 
 * Displays key metrics and statistics for the dashboard.
 * Designed to be a comprehensive status overview.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusCard } from './StatusCard';
import { Calendar, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { DashboardStats as DashboardStatsType } from '@/types/dashboard';

interface DashboardStatsProps {
    stats: DashboardStatsType;
}

export const DashboardStats = React.memo<DashboardStatsProps>(({ stats }) => {
    return (
        <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    Today's Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 gap-4">
                    <StatusCard
                        label="Total Sessions"
                        value={stats.expectedPatients}
                        icon={Calendar}
                        color="blue"
                    />
                    <StatusCard
                        label="In Clinic"
                        value={stats.checkedInPatients}
                        icon={CheckCircle}
                        color="green"
                    />
                    <StatusCard
                        label="Pending Arrival"
                        value={stats.pendingCheckIns}
                        icon={Clock}
                        color="amber"
                    />

                </div>
            </CardContent>
        </Card>
    );
});

DashboardStats.displayName = 'DashboardStats';
