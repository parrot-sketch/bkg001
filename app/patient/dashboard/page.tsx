'use client';

/**
 * Patient Dashboard
 * 
 * Modern, fluid design with ultimate user experience:
 * - No card clutter
 * - Clear visual hierarchy
 * - Proper typography and spacing
 * - Responsive and optimized
 * - Proper branding integration
 * 
 * REFACTORED: Replaced manual useState/useEffect fetch with React Query hooks
 * REASON: Eliminates manual loading state, error handling, and fetch logic.
 * Provides automatic caching, retries, and background refetching.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/patient/useAuth';
import { usePatient, usePatientUpcomingAppointments, usePatientAppointments } from '@/hooks/patients/usePatients';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { ConsultationInquiryBanner } from '@/components/patient/ConsultationInquiryBanner';
import { ConsultationCTA } from '@/components/portal/ConsultationCTA';
import { useRouter } from 'next/navigation';
import { calculateProfileCompletion } from '@/utils/patient-profile';
import { BookAppointmentDialog } from '@/components/patient/BookAppointmentDialog';
import { RequestConsultationDialog } from '@/components/patient/RequestConsultationDialog';

export default function PatientDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showBookDialog, setShowBookDialog] = useState(false);

  // REFACTORED: Replaced manual useState/useEffect with React Query
  // React Query handles: loading, error, retries, caching, deduplication automatically
  // Also handles automatic refetch on window focus (replaces manual focus listeners)
  const { 
    data: patient, 
    isLoading: loadingPatient 
  } = usePatient(user?.id, isAuthenticated && !!user);
  
  // Handle undefined patient (may not exist yet)
  const patientData = patient ?? null;
  
  const { 
    data: upcomingAppointments = [], 
    isLoading: loadingAppointments 
  } = usePatientUpcomingAppointments(user?.id, isAuthenticated && !!user);

  // Get all appointments for compatibility with existing code
  const { 
    data: allAppointments = []
  } = usePatientAppointments(user?.id, isAuthenticated && !!user);

  // Filter consultation inquiries
  const consultationInquiries = useMemo(() => {
    return allAppointments.filter((apt) => {
      const hasConsultationStatus = apt.consultationRequestStatus !== undefined;
      const isNotCompletedOrCancelled = 
        apt.status !== AppointmentStatus.COMPLETED && 
        apt.status !== AppointmentStatus.CANCELLED;
      return hasConsultationStatus && isNotCompletedOrCancelled;
    });
  }, [allAppointments]);

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    return calculateProfileCompletion(patientData);
  }, [patientData]);

  // Computed stats
  const stats = useMemo(() => {
    const today = new Date();
    const upcomingCount = upcomingAppointments.length;
    const inquiryCount = consultationInquiries.length;
    
    // Count today's appointments
    const todayCount = upcomingAppointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      return isToday(aptDate);
    }).length;

    // Count tomorrow's appointments
    const tomorrowCount = upcomingAppointments.filter((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      return isTomorrow(aptDate);
    }).length;

    return {
      upcoming: upcomingCount,
      today: todayCount,
      tomorrow: tomorrowCount,
      inquiries: inquiryCount,
    };
  }, [upcomingAppointments, consultationInquiries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <p className="text-muted-foreground mb-4">Please log in to access your dashboard</p>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Profile Completion Alert */}
      {!loadingPatient && !profileCompletion.isComplete && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-50/50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#fef3c7"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke={profileCompletion.percentage >= 80 ? '#10b981' : profileCompletion.percentage >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${profileCompletion.percentage}, 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900">
                  {profileCompletion.percentage}%
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <h3 className="text-base font-semibold text-slate-900">Complete Your Profile</h3>
              </div>
              <p className="text-sm text-slate-700 mb-3">
                Your profile is {profileCompletion.percentage}% complete. Complete it to streamline consultation requests.
              </p>
              {(profileCompletion.missingFields.length > 0 || profileCompletion.missingConsents.length > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-800">Missing required fields:</p>
                  <ul className="text-xs text-slate-700 space-y-1">
                    {profileCompletion.missingFields.slice(0, 3).map((field: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        {field}
                      </li>
                    ))}
                    {profileCompletion.missingConsents.slice(0, 3).map((consent: string, idx: number) => (
                      <li key={`consent-${idx}`} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        {consent}
                      </li>
                    ))}
                    {(profileCompletion.missingFields.length + profileCompletion.missingConsents.length) > 3 && (
                      <li className="text-slate-600 italic">
                        + {(profileCompletion.missingFields.length + profileCompletion.missingConsents.length) - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
              <div className="mt-4">
                <Link href="/patient/profile">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    Complete Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Request Priority Banner */}
      {consultationInquiries.length > 0 && (
        <div>
          <ConsultationInquiryBanner 
            inquiries={consultationInquiries} 
            onAction={() => router.push('/patient/appointments')}
          />
        </div>
      )}

      {/* Stats Section - Fluid grid, no cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatItem
          label="Today"
          value={stats.today}
          icon={Calendar}
          highlight={stats.today > 0}
          href="/patient/appointments"
        />
        <StatItem
          label="Upcoming"
          value={stats.upcoming}
          icon={Clock}
          href="/patient/appointments"
        />
        <StatItem
          label="Inquiries"
          value={stats.inquiries}
          icon={FileText}
          highlight={stats.inquiries > 0}
          href="/patient/appointments"
        />
        <StatItem
          label="Profile"
          value={profileCompletion.percentage}
          icon={User}
          actionLabel={profileCompletion.isComplete ? "Complete" : `${profileCompletion.percentage}% complete`}
          href="/patient/profile"
          highlight={!profileCompletion.isComplete}
        />
      </section>

      {/* Quick Actions - Fluid design */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowRequestDialog(true)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Request Consultation</h3>
            </div>
            <p className="text-sm text-muted-foreground">Submit a consultation request for review</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowBookDialog(true)}>
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-lg bg-teal-500/10 p-2">
                <Calendar className="h-5 w-5 text-teal-600" />
              </div>
              <h3 className="font-semibold text-lg">Book Appointment</h3>
            </div>
            <p className="text-sm text-muted-foreground">See availability and book immediately</p>
          </div>
          <ActionCard
            title="View Appointments"
            description="See all your scheduled appointments"
            icon={Clock}
            href="/patient/appointments"
          />
        </div>
      </section>

      {/* Upcoming Appointments - Modern list design */}
      {stats.upcoming > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Upcoming Appointments</h2>
              <p className="text-sm text-slate-600 mt-1">Your scheduled sessions</p>
            </div>
            <Link href="/patient/appointments">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loadingAppointments ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 5).map((appointment) => (
                <AppointmentListItem
                  key={appointment.id}
                  appointment={appointment}
                  showDoctorInfo={true}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Empty State - Modern CTA */}
      {stats.upcoming === 0 && !loadingAppointments && (
        <section className="text-center py-16 space-y-6">
          <div className="space-y-2">
            <Calendar className="h-16 w-16 text-slate-300 mx-auto" />
            <h3 className="text-xl font-semibold text-slate-900">No upcoming appointments</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              Ready to begin your aesthetic surgery journey? Book a consultation with our expert surgeons.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setShowRequestDialog(true)} variant="outline" size="lg">
              Request Consultation
            </Button>
            <Button onClick={() => setShowBookDialog(true)} size="lg" className="bg-teal-600 hover:bg-teal-700">
              Book Appointment
            </Button>
          </div>
        </section>
      )}

      {/* Dialogs */}
      {user && (
        <>
          <RequestConsultationDialog
            open={showRequestDialog}
            onClose={() => setShowRequestDialog(false)}
            onSuccess={() => {
              setShowRequestDialog(false);
              // REFACTORED: Invalidate query cache to refetch updated data
              queryClient.invalidateQueries({ queryKey: ['patients', user.id, 'appointments'] });
            }}
            patientId={user.id}
          />
          <BookAppointmentDialog
            open={showBookDialog}
            onClose={() => setShowBookDialog(false)}
            onSuccess={() => {
              setShowBookDialog(false);
              // REFACTORED: Invalidate query cache to refetch updated data
              queryClient.invalidateQueries({ queryKey: ['patients', user.id, 'appointments'] });
            }}
            patientId={user.id}
          />
        </>
      )}
    </div>
  );
}

/**
 * Stat Item Component
 * Fluid design without card containers
 */
function StatItem({
  label,
  value,
  icon: Icon,
  highlight = false,
  actionLabel,
  href,
}: {
  label: string;
  value: number | null;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  actionLabel?: string;
  href?: string;
}) {
  const content = (
    <div
      className={`
        relative p-6 rounded-xl border transition-all duration-200
        ${highlight 
          ? 'border-brand-primary/30 bg-gradient-to-br from-brand-primary/5 to-transparent shadow-sm' 
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
        }
        ${href ? 'cursor-pointer group' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${highlight ? 'bg-brand-primary/10' : 'bg-slate-100'}`}>
          <Icon className={`h-5 w-5 ${highlight ? 'text-brand-primary' : 'text-slate-600'}`} />
        </div>
        {href && (
          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-transform" />
        )}
      </div>
      <div>
        <p className={`text-3xl font-bold ${highlight ? 'text-brand-primary' : 'text-slate-900'}`}>
          {value !== null ? value.toLocaleString() : '—'}
        </p>
        <p className="text-sm text-slate-600 mt-1 font-medium">{label}</p>
        {actionLabel && (
          <p className="text-xs text-slate-500 mt-2">{actionLabel}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Action Card Component
 * Modern, fluid design
 */
function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  primary = false,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`
        group relative p-6 rounded-xl border transition-all duration-200 block
        ${primary 
          ? 'border-brand-primary/30 bg-gradient-to-br from-brand-primary/5 via-brand-primary/2 to-transparent hover:shadow-lg hover:border-brand-primary/50' 
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${primary ? 'bg-brand-primary/10' : 'bg-slate-100'}`}>
          <Icon className={`h-5 w-5 ${primary ? 'text-brand-primary' : 'text-slate-600'}`} />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-transform" />
      </div>
      <div>
        <h3 className={`text-lg font-semibold mb-1 ${primary ? 'text-brand-primary' : 'text-slate-900'}`}>
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </Link>
  );
}

/**
 * Appointment List Item
 * Modern, fluid list design without cards
 */
function AppointmentListItem({
  appointment,
  showDoctorInfo = false,
}: {
  appointment: AppointmentResponseDto;
  showDoctorInfo?: boolean;
}) {
  const appointmentDate = new Date(appointment.appointmentDate);
  const isTodayAppointment = isToday(appointmentDate);
  const isTomorrowAppointment = isTomorrow(appointmentDate);
  
  let dateLabel = '';
  if (isTodayAppointment) {
    dateLabel = 'Today';
  } else if (isTomorrowAppointment) {
    dateLabel = 'Tomorrow';
  } else {
    const daysUntil = differenceInDays(appointmentDate, new Date());
    dateLabel = `${daysUntil} days`;
  }

  const statusConfig = getAppointmentStatusConfig(appointment.status);

  return (
    <Link
      href={`/patient/appointments/${appointment.id}`}
      className="group block p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Date Badge */}
          <div className={`
            flex-shrink-0 w-16 h-16 rounded-lg flex flex-col items-center justify-center
            ${isTodayAppointment 
              ? 'bg-brand-primary/10 border-2 border-brand-primary/30' 
              : 'bg-slate-100 border border-slate-200'
            }
          `}>
            <span className={`text-xs font-semibold ${isTodayAppointment ? 'text-brand-primary' : 'text-slate-600'}`}>
              {format(appointmentDate, 'MMM')}
            </span>
            <span className={`text-xl font-bold ${isTodayAppointment ? 'text-brand-primary' : 'text-slate-900'}`}>
              {format(appointmentDate, 'd')}
            </span>
          </div>

          {/* Appointment Details */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-slate-900 truncate">
                {appointment.type}
              </h3>
              {statusConfig && (
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1
                  ${statusConfig.className}
                `}>
                  {statusConfig.icon && <statusConfig.icon className="h-3 w-3" />}
                  {statusConfig.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {appointment.time}
              </span>
              <span>•</span>
              <span className={isTodayAppointment ? 'font-semibold text-brand-primary' : ''}>
                {dateLabel}
              </span>
              {showDoctorInfo && appointment.doctorId && (
                <>
                  <span>•</span>
                  <span>Dr. {appointment.doctorId.slice(0, 8)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Arrow Icon */}
        <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </div>
    </Link>
  );
}


/**
 * Get appointment status configuration
 */
function getAppointmentStatusConfig(status: string) {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return {
        label: 'Scheduled',
        className: 'bg-green-50 text-green-700 border border-green-200',
        icon: CheckCircle,
      };
    case AppointmentStatus.PENDING:
      return {
        label: 'Pending',
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: Clock,
      };
    case AppointmentStatus.COMPLETED:
      return {
        label: 'Completed',
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: CheckCircle,
      };
    case AppointmentStatus.CANCELLED:
      return {
        label: 'Cancelled',
        className: 'bg-red-50 text-red-700 border border-red-200',
        icon: AlertCircle,
      };
    default:
      return null;
  }
}
