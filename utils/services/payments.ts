import db from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function getPaymentRecords({
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
    // CRITICAL: Enforce maximum limit to prevent unbounded queries
    // Protects against malicious abuse, accidental heavy fetches, memory pressure, and connection hogging
    const MAX_LIMIT = 100;
    const LIMIT = Math.min(Number(limit) || 10, MAX_LIMIT);

    const SKIP = (PAGE_NUMBER - 1) * LIMIT;

    const where: Prisma.PaymentWhereInput = {
      OR: [
        {
          patient: {
            first_name: { contains: search, mode: "insensitive" },
          },
        },
        {
          patient: {
            last_name: { contains: search, mode: "insensitive" },
          },
        },
        { patient_id: { contains: search, mode: "insensitive" } },
      ],
    };

    // REFACTORED: Use select instead of include for better performance
    // Only fetch fields actually used by the UI
    const [data, totalRecords] = await Promise.all([
      db.payment.findMany({
        where: where,
        select: {
          id: true,
          patient_id: true,
          appointment_id: true,
          total_amount: true,
          amount_paid: true,
          discount: true,
          payment_method: true,
          status: true,
          created_at: true,
          updated_at: true,
          patient: {
            select: {
              first_name: true,
              last_name: true,
              date_of_birth: true,
              img: true,
              colorCode: true,
              gender: true,
            },
          },
        },
        skip: SKIP,
        take: LIMIT,
        orderBy: { created_at: "desc" },
      }),
      db.payment.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / LIMIT);

    return {
      success: true,
      data,
      totalRecords,
      totalPages,
      currentPage: PAGE_NUMBER,
      status: 200,
    };
  } catch (error) {
    console.log(error);
    return { success: false, message: "Internal Server Error", status: 500 };
  }
}
