import { PrismaClient, Payment, PatientBill, BillType, PaymentStatus } from '@prisma/client';

interface TheaterFeeResult {
    created: boolean;
    theaterFee: {
        amount: number;
        serviceName: string;
        hours: number;
    } | null;
}

interface BillingReversalResult {
    reversed: boolean;
    amount: number;
}

export class TheaterBillingService {
    constructor(private prisma: PrismaClient) {}

    /**
     * Create theater fee billing for a confirmed booking
     */
    async createTheaterFeeForBooking(
        booking: any,
        confirmedBooking: any
    ): Promise<TheaterFeeResult> {
        const now = new Date();
        
        // Calculate duration and fee
        const durationMs = booking.end_time.getTime() - booking.start_time.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        const feeAmount = Math.round((booking.theater.hourly_rate || 0) * durationHours);

        let billingCreated = false;

        // Find or create theater fee service
        let theaterService = await this.prisma.service.findFirst({
            where: { service_name: 'Theater Usage Fee', category: 'THEATER' },
        });

        if (!theaterService) {
            theaterService = await this.prisma.service.create({
                data: {
                    service_name: 'Theater Usage Fee',
                    description: 'Calculated hourly theater room usage fee',
                    price: 0,
                    category: 'THEATER',
                    price_type: 'VARIABLE',
                    is_active: true,
                },
            });
        }

        // Create or update payment
        const payment = await this.prisma.payment.upsert({
            where: { surgical_case_id: booking.surgical_case_id },
            create: {
                patient_id: booking.surgical_case.patient.id,
                surgical_case_id: booking.surgical_case_id,
                bill_date: now,
                total_amount: feeAmount,
                bill_type: BillType.SURGERY,
                status: PaymentStatus.UNPAID,
            },
            update: {
                total_amount: { increment: feeAmount },
            },
        });

        // Remove existing theater fee line items (idempotent)
        await this.prisma.patientBill.deleteMany({
            where: {
                payment_id: payment.id,
                service_id: theaterService.id,
            },
        });

        // Create theater fee line item
        if (feeAmount > 0) {
            await this.prisma.patientBill.create({
                data: {
                    payment_id: payment.id,
                    service_id: theaterService.id,
                    service_date: booking.start_time,
                    quantity: 1,
                    unit_cost: feeAmount,
                    total_cost: feeAmount,
                },
            });
            billingCreated = true;
        }

        return {
            created: billingCreated,
            theaterFee: billingCreated
                ? {
                    amount: feeAmount,
                    serviceName: 'Theater Usage Fee',
                    hours: parseFloat(durationHours.toFixed(2)),
                }
                : null,
        };
    }

    /**
     * Reverse theater fee billing when a booking is cancelled
     */
    async reverseTheaterFee(caseId: string): Promise<BillingReversalResult> {
        const theaterService = await this.prisma.service.findFirst({
            where: { service_name: 'Theater Usage Fee', category: 'THEATER' },
        });

        if (!theaterService) {
            return { reversed: false, amount: 0 };
        }

        const payment = await this.prisma.payment.findUnique({
            where: { surgical_case_id: caseId },
        });

        if (!payment) {
            return { reversed: false, amount: 0 };
        }

        const feeLineItems = await this.prisma.patientBill.findMany({
            where: { payment_id: payment.id, service_id: theaterService.id },
        });

        const reversedAmount = feeLineItems.reduce((sum, item) => sum + item.total_cost, 0);

        if (reversedAmount > 0) {
            // Deduct from payment
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { total_amount: { decrement: reversedAmount } },
            });

            // Delete line items
            await this.prisma.patientBill.deleteMany({
                where: { payment_id: payment.id, service_id: theaterService.id },
            });

            return { reversed: true, amount: reversedAmount };
        }

        return { reversed: false, amount: 0 };
    }
}
