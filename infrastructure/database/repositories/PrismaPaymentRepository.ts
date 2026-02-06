import { PrismaClient } from '@prisma/client';
import {
  IPaymentRepository,
  Payment,
  PaymentWithRelations,
  CreatePaymentDto,
  RecordPaymentDto,
} from '../../../domain/interfaces/repositories/IPaymentRepository';
import { PaymentStatus } from '../../../domain/enums/PaymentStatus';
import { PaymentMethod } from '../../../domain/enums/PaymentMethod';

/**
 * Prisma Implementation: PrismaPaymentRepository
 * 
 * Implements IPaymentRepository using Prisma ORM.
 * 
 * Features:
 * - Automatic receipt number generation
 * - Smart status calculation based on amounts
 * - Efficient queries with proper indexing
 */
export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Map Prisma result to domain Payment
   */
  private mapToPayment(data: any): Payment {
    return {
      id: data.id,
      patientId: data.patient_id,
      appointmentId: data.appointment_id,
      billDate: data.bill_date,
      paymentDate: data.payment_date,
      discount: data.discount,
      totalAmount: data.total_amount,
      amountPaid: data.amount_paid,
      paymentMethod: data.payment_method as PaymentMethod,
      status: data.status as PaymentStatus,
      receiptNumber: data.receipt_number,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Map Prisma result with relations to domain PaymentWithRelations
   */
  private mapToPaymentWithRelations(data: any): PaymentWithRelations {
    const payment = this.mapToPayment(data);
    
    return {
      ...payment,
      patient: data.patient ? {
        id: data.patient.id,
        firstName: data.patient.first_name,
        lastName: data.patient.last_name,
        email: data.patient.email,
        phone: data.patient.phone,
      } : undefined,
      appointment: data.appointment ? {
        id: data.appointment.id,
        appointmentDate: data.appointment.appointment_date,
        time: data.appointment.time,
        doctorId: data.appointment.doctor_id,
        doctorName: data.appointment.doctor?.name,
      } : undefined,
      billItems: data.bill_items?.map((item: any) => ({
        id: item.id,
        serviceName: item.service?.service_name || 'Unknown Service',
        quantity: item.quantity,
        unitCost: item.unit_cost,
        totalCost: item.total_cost,
      })),
    };
  }

  async findById(id: number): Promise<Payment | null> {
    const result = await this.prisma.payment.findUnique({
      where: { id },
    });
    return result ? this.mapToPayment(result) : null;
  }

  async findByAppointmentId(appointmentId: number): Promise<Payment | null> {
    const result = await this.prisma.payment.findUnique({
      where: { appointment_id: appointmentId },
    });
    return result ? this.mapToPayment(result) : null;
  }

  async findByPatientId(patientId: string): Promise<Payment[]> {
    const results = await this.prisma.payment.findMany({
      where: { patient_id: patientId },
      orderBy: { bill_date: 'desc' },
    });
    return results.map(this.mapToPayment.bind(this));
  }

  async findByStatus(status: PaymentStatus, limit?: number): Promise<PaymentWithRelations[]> {
    const results = await this.prisma.payment.findMany({
      where: { status },
      include: {
        patient: true,
        appointment: {
          include: {
            doctor: true,
          },
        },
        bill_items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { bill_date: 'desc' },
      take: limit,
    });
    return results.map(this.mapToPaymentWithRelations.bind(this));
  }

  async findPendingPayments(limit?: number): Promise<PaymentWithRelations[]> {
    const results = await this.prisma.payment.findMany({
      where: {
        status: {
          in: ['UNPAID', 'PART'],
        },
      },
      include: {
        patient: true,
        appointment: {
          include: {
            doctor: true,
          },
        },
        bill_items: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { bill_date: 'asc' }, // Oldest first (FIFO)
      take: limit,
    });
    return results.map(this.mapToPaymentWithRelations.bind(this));
  }

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const result = await this.prisma.payment.create({
      data: {
        patient_id: dto.patientId,
        appointment_id: dto.appointmentId,
        bill_date: new Date(),
        total_amount: dto.totalAmount,
        discount: dto.discount || 0,
        amount_paid: 0,
        payment_method: 'CASH', // Default
        status: 'UNPAID',
        // Create bill items if provided
        bill_items: dto.billItems ? {
          create: dto.billItems.map(item => ({
            service_id: item.serviceId,
            service_date: new Date(),
            quantity: item.quantity,
            unit_cost: item.unitCost,
            total_cost: item.quantity * item.unitCost,
          })),
        } : undefined,
      },
    });
    return this.mapToPayment(result);
  }

  async recordPayment(dto: RecordPaymentDto): Promise<Payment> {
    // Get current payment
    const current = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (!current) {
      throw new Error(`Payment ${dto.paymentId} not found`);
    }

    // Calculate new total paid
    const newAmountPaid = current.amount_paid + dto.amountPaid;
    const payableAmount = current.total_amount - current.discount;

    // Determine new status
    let newStatus: PaymentStatus;
    if (newAmountPaid >= payableAmount) {
      newStatus = PaymentStatus.PAID;
    } else if (newAmountPaid > 0) {
      newStatus = PaymentStatus.PART;
    } else {
      newStatus = PaymentStatus.UNPAID;
    }

    const result = await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        amount_paid: newAmountPaid,
        payment_method: dto.paymentMethod,
        status: newStatus,
        payment_date: newStatus === PaymentStatus.PAID ? new Date() : current.payment_date,
      },
    });

    return this.mapToPayment(result);
  }

  async applyDiscount(paymentId: number, discount: number): Promise<Payment> {
    const current = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!current) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    // Recalculate status after discount
    const payableAmount = current.total_amount - discount;
    let newStatus = current.status;
    
    if (current.amount_paid >= payableAmount) {
      newStatus = PaymentStatus.PAID;
    } else if (current.amount_paid > 0) {
      newStatus = PaymentStatus.PART;
    }

    const result = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        discount,
        status: newStatus,
        payment_date: newStatus === PaymentStatus.PAID ? new Date() : current.payment_date,
      },
    });

    return this.mapToPayment(result);
  }

  async generateReceipt(paymentId: number): Promise<Payment> {
    // Generate receipt number: RCP-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get count of receipts today for sequence
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const todayCount = await this.prisma.payment.count({
      where: {
        receipt_number: {
          not: null,
        },
        created_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const sequence = String(todayCount + 1).padStart(4, '0');
    const receiptNumber = `RCP-${dateStr}-${sequence}`;

    const result = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { receipt_number: receiptNumber },
    });

    return this.mapToPayment(result);
  }

  async getTodaySummary(): Promise<{
    totalBilled: number;
    totalCollected: number;
    pendingCount: number;
    paidCount: number;
  }> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [billedToday, collectedToday, pendingCount, paidCount] = await Promise.all([
      // Total billed today
      this.prisma.payment.aggregate({
        where: {
          bill_date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        _sum: {
          total_amount: true,
        },
      }),
      // Total collected today
      this.prisma.payment.aggregate({
        where: {
          payment_date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        _sum: {
          amount_paid: true,
        },
      }),
      // Pending payments count
      this.prisma.payment.count({
        where: {
          status: {
            in: ['UNPAID', 'PART'],
          },
        },
      }),
      // Paid today count
      this.prisma.payment.count({
        where: {
          status: 'PAID',
          payment_date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      }),
    ]);

    return {
      totalBilled: billedToday._sum.total_amount || 0,
      totalCollected: collectedToday._sum.amount_paid || 0,
      pendingCount,
      paidCount,
    };
  }
}
