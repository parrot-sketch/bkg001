/**
 * API Route: POST /api/frontdesk/theater-scheduling/[caseId]/confirm
 *
 * Confirms a provisional theater booking.
 * Transitions case from READY_FOR_THEATER_BOOKING → SCHEDULED
 *
 * - Requires authentication (FRONTDESK or ADMIN)
 * - Validates booking exists and is locked by user
 * - Confirms booking and updates case status
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { db } from '@/lib/db';
import { TheaterService } from '@/application/services/TheaterService';
import { z } from 'zod';
import { format } from 'date-fns';

const confirmBookingSchema = z.object({
    bookingId: z.string().uuid(),
});

const theaterService = new TheaterService(db);

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        // Await params (Next.js 15+ requirement)
        const { caseId } = await params;

        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { userId, role } = authResult.user;

        // 2. Check permissions (FRONTDESK or ADMIN only)
        if (role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only frontdesk staff can confirm theater bookings',
                },
                { status: 403 }
            );
        }

        // 3. Parse and validate request body
        const body = await request.json();
        const validationResult = confirmBookingSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request data',
                    details: validationResult.error.errors,
                },
                { status: 400 }
            );
        }

        const { bookingId } = validationResult.data;

        // 4. Validate booking belongs to case
        const booking = await db.theaterBooking.findUnique({
            where: { id: bookingId },
            select: { id: true, surgical_case_id: true, status: true },
        });

        if (!booking) {
            return NextResponse.json(
                { success: false, error: 'Booking not found' },
                { status: 404 }
            );
        }

        if (booking.surgical_case_id !== caseId) {
            return NextResponse.json(
                { success: false, error: 'Booking does not belong to this case' },
                { status: 400 }
            );
        }

        // 5. Confirm booking
        const confirmedBooking = await theaterService.confirmBooking(
            bookingId,
            userId,
            role
        );

        // 6. Get theater fee service and theater details for pricing
        const [theaterFeeService, confirmedBookingWithTheater] = await Promise.all([
            db.service.findFirst({
                where: { 
                    service_name: 'Theater Usage Fee',
                    is_active: true 
                }
            }),
            db.theaterBooking.findUnique({
                where: { id: bookingId },
                include: { theater: true }
            })
        ]);

        // Calculate theater fee based on duration and hourly rate
        let theaterFeeAmount = 0;
        if (confirmedBookingWithTheater?.theater?.hourly_rate) {
            const startTime = new Date(confirmedBooking.start_time);
            const endTime = new Date(confirmedBooking.end_time);
            const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            // Round to nearest hour, minimum 1 hour
            const hours = Math.max(1, Math.round(durationHours));
            theaterFeeAmount = hours * confirmedBookingWithTheater.theater.hourly_rate;
        }

        // 7. Fetch updated case with related data for notifications
        const updatedCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            include: {
                patient: { 
                    select: { 
                        id: true,
                        first_name: true, 
                        last_name: true, 
                        file_number: true 
                    } 
                },
                primary_surgeon: { 
                    select: { 
                        id: true, 
                        user_id: true 
                    } 
                },
                case_plan: { 
                    select: { 
                        procedure_plan: true 
                    } 
                },
                theater_booking: {
                    include: { 
                        theater: { 
                            select: { 
                                name: true 
                            } 
                        } 
                    },
                },
            },
        });

        // 8. Create billing record with theater fee
        if (theaterFeeService && updatedCase?.patient && theaterFeeAmount > 0) {
            const existingPayment = await db.payment.findUnique({
                where: { surgical_case_id: caseId }
            });

            if (!existingPayment) {
                // Create new payment with theater fee
                await db.payment.create({
                    data: {
                        patient_id: updatedCase.patient.id,
                        surgical_case_id: caseId,
                        payment_method: 'CASH',
                        status: 'UNPAID',
                        total_amount: theaterFeeAmount,
                        amount_paid: 0,
                        bill_type: 'SURGERY',
                        bill_date: new Date(),
                    }
                });
            } else {
                // Add theater fee to existing payment
                await db.payment.update({
                    where: { id: existingPayment.id },
                    data: { 
                        total_amount: { increment: theaterFeeAmount }
                    }
                });
            }

            // Add theater fee as a bill item
            const payment = await db.payment.findUnique({
                where: { surgical_case_id: caseId }
            });

            if (payment) {
                const existingBillItem = await db.patientBill.findFirst({
                    where: {
                        payment_id: payment.id,
                        service_id: theaterFeeService.id
                    }
                });

                if (!existingBillItem) {
                    await db.patientBill.create({
                        data: {
                            payment_id: payment.id,
                            service_id: theaterFeeService.id,
                            quantity: 1,
                            unit_cost: theaterFeeAmount,
                            total_cost: theaterFeeAmount,
                            service_date: new Date(),
                        }
                    });
                }
            }
        }

        // 9. Notify surgeon and nurse about theater booking
        if (updatedCase) {
            const { createNotification } = await import('@/lib/notifications/createNotification');
            const procedureName = (updatedCase.case_plan?.procedure_plan as any)?.procedureName || 'Surgical procedure';
            // theater_booking is singular (optional), not an array
            const theaterName = updatedCase.theater_booking?.theater?.name || 'Theater';
            const bookingDate = format(confirmedBooking.start_time, 'MMM d, yyyy');
            const bookingTime = format(confirmedBooking.start_time, 'HH:mm');
            
            // Construct patient full name from first_name and last_name
            const patientFullName = updatedCase.patient 
                ? `${updatedCase.patient.first_name} ${updatedCase.patient.last_name}`.trim()
                : 'Patient';

            // Notify surgeon
            if (updatedCase.primary_surgeon?.user_id) {
                await createNotification({
                    userId: updatedCase.primary_surgeon.user_id,
                    type: 'IN_APP',
                    subject: 'Theater Booked for Your Case',
                    message: `${patientFullName} - ${procedureName} scheduled for ${bookingDate} at ${bookingTime} in ${theaterName}.`,
                    metadata: {
                        surgicalCaseId: caseId,
                        bookingId: bookingId,
                        event: 'THEATER_BOOKED',
                    },
                    senderId: userId,
                });
            }

            // Notify all nurses (they handle pre-op and intra-op)
            const { createNotificationForRole } = await import('@/lib/notifications/createNotification');
            await createNotificationForRole(Role.NURSE, {
                type: 'IN_APP',
                subject: 'Theater Booking Confirmed',
                message: `${patientFullName} - ${procedureName} scheduled for ${bookingDate} at ${bookingTime} in ${theaterName}.`,
                metadata: {
                    surgicalCaseId: caseId,
                    bookingId: bookingId,
                    event: 'THEATER_BOOKED',
                },
                senderId: userId,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                bookingId: confirmedBooking.id,
                status: confirmedBooking.status,
                theaterId: confirmedBooking.theater_id,
                startTime: confirmedBooking.start_time,
                endTime: confirmedBooking.end_time,
                confirmedAt: confirmedBooking.confirmed_at,
                caseStatus: updatedCase?.status,
                billingCreated: theaterFeeAmount > 0,
                theaterFee: theaterFeeAmount > 0 ? {
                    amount: theaterFeeAmount,
                    serviceName: 'Theater Usage Fee',
                    theaterName: confirmedBookingWithTheater?.theater?.name
                } : null,
            },
        });
    } catch (error) {
        console.error('[API] /api/frontdesk/theater-scheduling/[caseId]/confirm POST - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to confirm theater booking',
            },
            { status: 500 }
        );
    }
}
