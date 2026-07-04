'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { SectionBackground } from '@/components/doctor/appointments/SectionBackground';

interface AppointmentAnalyticsProps {
  appointments: AppointmentResponseDto[];
  isLoading?: boolean;
}

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  PENDING_DOCTOR_CONFIRMATION: '#caa26a',
  SCHEDULED: '#2c2e4b',
  CONFIRMED: '#2c2e4b',
  CHECKED_IN: '#2c2e4b',
  READY_FOR_CONSULTATION: '#caa26a',
  IN_CONSULTATION: '#8b5cf6',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
  NO_SHOW: '#ef4444',
  PENDING: '#caa26a',
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING_DOCTOR_CONFIRMATION: 'Needs Confirm',
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked In',
  READY_FOR_CONSULTATION: 'Ready',
  IN_CONSULTATION: 'In Consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
  PENDING: 'Pending',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#e7d6bf] rounded-lg p-3 shadow-lg">
        <p className="text-xs font-medium text-[#2c2e4b] mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-[#2c2e4b]/80">
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AppointmentAnalytics({ appointments, isLoading }: AppointmentAnalyticsProps) {
  const statusData = useMemo(() => {
    const counts: Record<AppointmentStatus, number> = {
      PENDING_DOCTOR_CONFIRMATION: 0,
      SCHEDULED: 0,
      CONFIRMED: 0,
      CHECKED_IN: 0,
      READY_FOR_CONSULTATION: 0,
      IN_CONSULTATION: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
      PENDING: 0,
    };

    appointments.forEach((apt) => {
      const status = apt.status as AppointmentStatus;
      if (status in counts) {
        counts[status]++;
      }
    });

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status as AppointmentStatus] || status,
        value: count,
        status: status as AppointmentStatus,
      }));
  }, [appointments]);

  const volumeData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map((date) => {
      const dateStr = date.toISOString().split('T')[0];
      const count = appointments.filter((apt) => {
        const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
        return aptDate === dateStr;
      }).length;

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count,
      };
    });
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-[#e7d6bf] shadow-sm">
          <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
            <CardTitle className="text-sm font-semibold text-[#2c2e4b]">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-[#e7d6bf]/60 animate-pulse rounded" />
              <div className="h-[140px] bg-[#e7d6bf]/60 animate-pulse rounded-lg" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[#e7d6bf] shadow-sm">
          <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
            <CardTitle className="text-sm font-semibold text-[#2c2e4b]">7-Day Volume</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-[#e7d6bf]/60 animate-pulse rounded" />
              <div className="h-[140px] bg-[#e7d6bf]/60 animate-pulse rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-[#e7d6bf] shadow-sm">
          <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
            <CardTitle className="text-sm font-semibold text-[#2c2e4b]">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-8 text-center">
            <p className="text-xs text-[#2c2e4b]/50">No data</p>
          </CardContent>
        </Card>
        <Card className="border border-[#e7d6bf] shadow-sm">
          <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
            <CardTitle className="text-sm font-semibold text-[#2c2e4b]">7-Day Volume</CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-8 text-center">
            <p className="text-xs text-[#2c2e4b]/50">No data</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionBackground overlayOpacity={0.75} imageOpacity={0.1}>
          <Card className="border border-[#2c2e4b]/10 bg-transparent shadow-none">
            <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
              <CardTitle className="text-sm font-semibold text-[#2c2e4b]">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-[#2c2e4b]/10 animate-pulse rounded" />
                <div className="h-[140px] bg-[#2c2e4b]/10 animate-pulse rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </SectionBackground>
        <SectionBackground overlayOpacity={0.75} imageOpacity={0.1}>
          <Card className="border border-[#2c2e4b]/10 bg-transparent shadow-none">
            <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
              <CardTitle className="text-sm font-semibold text-[#2c2e4b]">7-Day Volume</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-[#2c2e4b]/10 animate-pulse rounded" />
                <div className="h-[140px] bg-[#2c2e4b]/10 animate-pulse rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </SectionBackground>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionBackground overlayOpacity={0.75} imageOpacity={0.1}>
          <Card className="border border-[#2c2e4b]/10 bg-transparent shadow-none">
            <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
              <CardTitle className="text-sm font-semibold text-[#2c2e4b]">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-8 text-center">
              <p className="text-xs text-[#2c2e4b]/70">No data</p>
            </CardContent>
          </Card>
        </SectionBackground>
        <SectionBackground overlayOpacity={0.75} imageOpacity={0.1}>
          <Card className="border border-[#2c2e4b]/10 bg-transparent shadow-none">
            <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
              <CardTitle className="text-sm font-semibold text-[#2c2e4b]">7-Day Volume</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-8 text-center">
              <p className="text-xs text-[#2c2e4b]/70">No data</p>
            </CardContent>
          </Card>
        </SectionBackground>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Status Breakdown */}
      <SectionBackground overlayOpacity={0.75} imageOpacity={0.1}>
        <Card className="border border-[#2c2e4b]/10 bg-transparent shadow-none">
          <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
            <CardTitle className="text-sm font-semibold text-[#2c2e4b]">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {statusData.map((entry) => (
                  <div key={entry.status} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.status] }}
                      />
                      <span className="text-xs text-[#2c2e4b]">{entry.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#2c2e4b]">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </SectionBackground>

      {/* 7-Day Volume */}
      <SectionBackground overlayOpacity={0.75} imageOpacity={0.1}>
        <Card className="border border-[#2c2e4b]/10 bg-transparent shadow-none">
          <CardHeader className="border-b border-[#e7d6bf] px-4 py-3">
            <CardTitle className="text-sm font-semibold text-[#2c2e4b]">7-Day Volume</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7d6bf" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#2c2e4b' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#2c2e4b' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#e7d6bf' }} />
                  <Bar dataKey="count" fill="#2c2e4b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </SectionBackground>
    </div>
  );
}
