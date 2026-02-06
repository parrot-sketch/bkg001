import db, { withRetry } from "@/lib/db";
import { getMonth, format, startOfYear, endOfMonth, isToday, subMonths } from "date-fns";
import { daysOfWeek } from "@/lib/utils";

type AppointmentStatus = "PENDING" | "SCHEDULED" | "COMPLETED" | "CANCELLED";

interface Appointment {
  status: AppointmentStatus;
  appointment_date: Date;
}

function isValidStatus(status: string): status is AppointmentStatus {
  return ["PENDING", "SCHEDULED", "COMPLETED", "CANCELLED"].includes(status);
}

const initializeMonthlyData = () => {
  const this_year = new Date().getFullYear();

  const months = Array.from(
    { length: getMonth(new Date()) + 1 },
    (_, index) => ({
      name: format(new Date(this_year, index), "MMM"),
      appointment: 0,
      completed: 0,
    })
  );
  return months;
};

export const processAppointments = async (appointments: Appointment[]) => {
  const monthlyData = initializeMonthlyData();

  const appointmentCounts = appointments.reduce<
    Record<AppointmentStatus, number>
  >(
    (acc, appointment) => {
      const status = appointment.status;

      const appointmentDate = appointment?.appointment_date;

      const monthIndex = getMonth(appointmentDate);

      if (
        appointmentDate >= startOfYear(new Date()) &&
        appointmentDate <= endOfMonth(new Date())
      ) {
        monthlyData[monthIndex].appointment += 1;

        if (status === "COMPLETED") {
          monthlyData[monthIndex].completed += 1;
        }
      }

      // Grouping by status
      if (isValidStatus(status)) {
        acc[status] = (acc[status] || 0) + 1;
      }

      return acc;
    },
    {
      PENDING: 0,
      SCHEDULED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    }
  );

  return { appointmentCounts, monthlyData };
};

export async function getPatientDashboardStatistics(id: string) {
  try {
    if (!id) {
      return {
        success: false,
        message: "No data found",
        data: null,
      };
    }

    const data = await db.patient.findUnique({
      where: { id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        gender: true,
        img: true,
        colorCode: true,
      },
    });

    if (!data) {
      return {
        success: false,
        message: "Patient data not found",
        status: 200,
        data: null,
      };
    }

    // Patient dashboard: last 6 months for statistics
    const since = subMonths(new Date(), 6);
    const yearStart = startOfYear(new Date());
    const yearEnd = endOfMonth(new Date());

    // Parallel execution: recent records, statistics, and monthly data
    const [
      last5Records,
      appointmentCountsResult,
      totalAppointmentsCount,
      monthlyAppointments,
    ] = await Promise.all([
      // Recent 5 appointments for display (last 6 months)
      db.appointment.findMany({
        where: {
          patient_id: data.id,
          appointment_date: { gte: since },
        },
        select: {
          id: true,
          patient_id: true,
          doctor_id: true,
          type: true,
          appointment_date: true,
          status: true,
          time: true,
          doctor: {
            select: {
              id: true,
              name: true,
              img: true,
              specialization: true,
              colorCode: true,
            },
          },
          patient: {
            select: {
              first_name: true,
              last_name: true,
              gender: true,
              date_of_birth: true,
              img: true,
              colorCode: true,
            },
          },
        },
        orderBy: { appointment_date: "desc" },
        take: 5, // Only fetch what's displayed
      }),

      // Database aggregation: status counts (last 6 months)
      db.appointment.groupBy({
        by: ["status"],
        where: {
          patient_id: data.id,
          appointment_date: { gte: since },
        },
        _count: true,
      }),

      // Total appointments count (last 6 months)
      db.appointment.count({
        where: {
          patient_id: data.id,
          appointment_date: { gte: since },
        },
      }),

      // Monthly data: fetch minimal data (date and status only) for current year
      db.appointment.findMany({
        where: {
          patient_id: data.id,
          appointment_date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        select: {
          appointment_date: true,
          status: true,
        },
      }),
    ]);

    // Transform database aggregation results to match UI expectations
    const appointmentCounts = appointmentCountsResult.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {
        PENDING: 0,
        SCHEDULED: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      } as Record<string, number>
    );

    // Monthly data: lightweight aggregation by month (current year only, max ~365 records)
    const monthlyDataMap = new Map<number, { appointment: number; completed: number }>();

    monthlyAppointments.forEach((apt) => {
      const monthIndex = getMonth(apt.appointment_date);
      const current = monthlyDataMap.get(monthIndex) || { appointment: 0, completed: 0 };
      current.appointment += 1;
      if (apt.status === "COMPLETED") {
        current.completed += 1;
      }
      monthlyDataMap.set(monthIndex, current);
    });

    // Format monthly data to match UI expectations
    const thisYear = new Date().getFullYear();
    const monthlyData = Array.from({ length: getMonth(new Date()) + 1 }, (_, index) => {
      const monthData = monthlyDataMap.get(index) || { appointment: 0, completed: 0 };
      return {
        name: format(new Date(thisYear, index), "MMM"),
        appointment: monthData.appointment,
        completed: monthData.completed,
      };
    });

    const todayIndex = new Date().getDay(); // 0 (Sunday) to 6 (Saturday)
    const todayName = daysOfWeek[todayIndex];

    const doctorsWithAvailability = await db.doctor.findMany({
      select: {
        id: true,
        name: true,
        specialization: true,
        img: true,
        colorCode: true,
        // Fetch active templates and their slots for today
        availability_templates: {
          where: { is_active: true },
          select: {
            slots: {
              where: { day_of_week: todayIndex },
              select: {
                day_of_week: true,
                start_time: true,
                end_time: true,
              }
            }
          }
        }
      },
      where: {
        availability_templates: {
          some: {
            is_active: true,
            slots: {
              some: {
                day_of_week: todayIndex
              }
            }
          }
        }
      },
      take: 4,
    });

    // Map to legacy structure for frontend compatibility
    const availableDoctor = doctorsWithAvailability.map(doc => {
      // Flatten slots from the active template (should be only one active template)
      const slots = doc.availability_templates.flatMap(t => t.slots);

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        img: doc.img,
        colorCode: doc.colorCode,
        working_days: slots.map(slot => ({
          day: daysOfWeek[slot.day_of_week], // Convert int back to string name
          start_time: slot.start_time,
          end_time: slot.end_time,
        }))
      };
    });

    return {
      success: true,
      data,
      appointmentCounts,
      last5Records,
      totalAppointments: totalAppointmentsCount,
      availableDoctor,
      monthlyData,
      status: 200,
    };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Internal Server Error", status: 500 };
  }
}

export async function getPatientById(id: string) {
  try {
    const patient = await db.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return {
        success: false,
        message: "Patient data not found",
        status: 200,
        data: null,
      };
    }

    return { success: true, data: patient, status: 200 };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Internal Server Error", status: 500 };
  }
}

/**
 * REFACTORED: Get patient full data by ID
 * 
 * Performance Optimizations Applied:
 * 1. ✅ Replaced include with select (only fetch needed fields)
 * 2. ✅ Already has take: 1 for appointments (good)
 * 
 * Preserved Behavior:
 * - Response shape unchanged
 * - Returns patient with appointment count and last visit
 */
export async function getPatientFullDataById(id: string) {
  try {
    // REFACTORED: Use select instead of include for better performance
    // Preserved all fields used by UI components (marital_status, blood_group, emergency_contact fields)
    const patient = await db.patient.findFirst({
      where: {
        OR: [
          {
            id,
          },
          { email: id },
        ],
      },
      select: {
        id: true,
        file_number: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        date_of_birth: true,
        gender: true,
        address: true,
        img: true,
        colorCode: true,
        marital_status: true, // Preserved for UI
        blood_group: true, // Preserved for UI
        emergency_contact_name: true, // Preserved for UI
        emergency_contact_number: true, // Preserved for UI
        relation: true, // Preserved for UI
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            appointments: true,
          },
        },
        appointments: {
          select: {
            appointment_date: true,
          },
          orderBy: {
            appointment_date: "desc",
          },
          take: 1,
        },
      },
    });

    if (!patient) {
      return {
        success: false,
        message: "Patient data not found",
        status: 404,
      };
    }
    const lastVisit = patient.appointments[0]?.appointment_date || null;

    return {
      success: true,
      data: {
        ...patient,
        totalAppointments: patient._count.appointments,
        lastVisit,
      },
      status: 200,
    };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Internal Server Error", status: 500 };
  }
}

export async function getAllPatients({
  page,
  limit,
  search,
}: {
  page: number | string;
  limit?: number | string;
  search?: string;
}) {
  try {
    const PAGE_NUMBER = Number(page) <= 0 ? 1 : Number(page);
    const LIMIT = Number(limit) || 10;

    const SKIP = (PAGE_NUMBER - 1) * LIMIT;

    // Build WHERE clause conditionally - only add search if provided
    const whereClause = search && search.trim()
      ? {
        OR: [
          { first_name: { contains: search.trim(), mode: "insensitive" as const } },
          { last_name: { contains: search.trim(), mode: "insensitive" as const } },
          { phone: { contains: search.trim(), mode: "insensitive" as const } },
          { email: { contains: search.trim(), mode: "insensitive" as const } },
        ],
      }
      : {};

    // Optimized query with select to fetch only needed fields
    // Wrapped in withRetry for connection resilience
    const [patients, totalRecords] = await Promise.all([
      withRetry(async () => {
        return await db.patient.findMany({
          where: whereClause,
          select: {
            id: true,
            file_number: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            date_of_birth: true,
            gender: true,
            address: true,
            img: true,
            colorCode: true,
            created_at: true,
            updated_at: true,
            // Only fetch the latest appointment with its latest medical record
            appointments: {
              select: {
                medical_records: {
                  select: {
                    created_at: true,
                    treatment_plan: true
                  },
                  orderBy: { created_at: "desc" as const },
                  take: 1,
                },
              },
              orderBy: { appointment_date: "desc" as const },
              take: 1,
            },
          },
          skip: SKIP,
          take: LIMIT,
          orderBy: { first_name: "asc" as const },
        });
      }),
      withRetry(async () => {
        // Count query must use the same WHERE clause
        return await db.patient.count({
          where: whereClause,
        });
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / LIMIT);

    return {
      success: true,
      data: patients,
      totalRecords,
      totalPages,
      currentPage: PAGE_NUMBER,
      status: 200,
    };
  } catch (error) {
    console.error('[getAllPatients] Error:', error);
    return { success: false, message: "Internal Server Error", status: 500 };
  }
}
