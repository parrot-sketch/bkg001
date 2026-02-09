import { PaymentStatus } from '../../enums/PaymentStatus';
import { PaymentMethod } from '../../enums/PaymentMethod';
import { BillType } from '../../enums/BillType';

/**
 * Payment Entity (simplified for repository interface)
 * 
 * Represents a bill/payment record. Can be linked to an appointment (consultation)
 * or a surgical case (surgery), but not necessarily both.
 */
export interface Payment {
  id: number;
  patientId: string;
  appointmentId: number | null;
  surgicalCaseId: string | null;
  billType: BillType;
  billDate: Date;
  paymentDate: Date | null;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  receiptNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment with related data for display
 */
export interface PaymentWithRelations extends Payment {
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  appointment?: {
    id: number;
    appointmentDate: Date;
    time: string;
    doctorId: string;
    doctorName?: string;
  } | null;
  surgicalCase?: {
    id: string;
    procedureName: string | null;
    surgeonName?: string;
  } | null;
  billItems?: Array<{
    id: number;
    serviceName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
}

/**
 * DTO for creating a new payment
 */
export interface CreatePaymentDto {
  patientId: string;
  appointmentId?: number;         // For consultation billing
  surgicalCaseId?: string;        // For surgery billing
  billType?: BillType;            // Defaults to CONSULTATION
  totalAmount: number;
  discount?: number;
  notes?: string;
  billItems?: Array<{
    serviceId: number;
    quantity: number;
    unitCost: number;
  }>;
}

/**
 * DTO for recording a payment
 */
export interface RecordPaymentDto {
  paymentId: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
}

/**
 * Repository Interface: IPaymentRepository
 * 
 * Defines the contract for payment data persistence.
 * Follows clean architecture - no infrastructure dependencies.
 * 
 * Business Rules:
 * - One payment per appointment (consultation billing)
 * - One payment per surgical case (surgery billing)
 * - Payment created when consultation completes or surgery is billed
 * - Frontdesk can record partial or full payments for either type
 */
export interface IPaymentRepository {
  /**
   * Find payment by ID
   */
  findById(id: number): Promise<Payment | null>;

  /**
   * Find payment by appointment ID
   * @returns Payment if exists (one-to-one relationship)
   */
  findByAppointmentId(appointmentId: number): Promise<Payment | null>;

  /**
   * Find payment by surgical case ID
   * @returns Payment if exists (one-to-one relationship)
   */
  findBySurgicalCaseId(surgicalCaseId: string): Promise<Payment | null>;

  /**
   * Find all payments for a patient
   */
  findByPatientId(patientId: string): Promise<Payment[]>;

  /**
   * Find payments by status (for frontdesk billing queue)
   * @param status - Payment status filter
   * @param limit - Optional limit
   */
  findByStatus(status: PaymentStatus, limit?: number): Promise<PaymentWithRelations[]>;

  /**
   * Find unpaid/partial payments (billing queue)
   */
  findPendingPayments(limit?: number): Promise<PaymentWithRelations[]>;

  /**
   * Create a new payment record
   * @param dto - Payment creation data
   * @returns Created payment with ID
   */
  create(dto: CreatePaymentDto): Promise<Payment>;

  /**
   * Record a payment (partial or full)
   * Updates amountPaid and status accordingly
   * @param dto - Payment recording data
   * @returns Updated payment
   */
  recordPayment(dto: RecordPaymentDto): Promise<Payment>;

  /**
   * Apply discount to payment
   * @param paymentId - Payment ID
   * @param discount - Discount amount
   * @returns Updated payment
   */
  applyDiscount(paymentId: number, discount: number): Promise<Payment>;

  /**
   * Generate and assign receipt number
   * @param paymentId - Payment ID
   * @returns Updated payment with receipt number
   */
  generateReceipt(paymentId: number): Promise<Payment>;

  /**
   * Get today's billing summary (for frontdesk dashboard)
   */
  getTodaySummary(): Promise<{
    totalBilled: number;
    totalCollected: number;
    pendingCount: number;
    paidCount: number;
  }>;
}
