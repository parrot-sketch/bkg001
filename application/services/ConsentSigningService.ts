import { PrismaClient, ConsentForm, ConsentSigningSession, VerificationMethod, SigningStatus } from '@prisma/client';
import { QrCodeService } from '@/lib/services/consent/QrCodeService';
import { OtpService } from '@/lib/services/consent/OtpService';
import { TwilioSmsService } from '@/infrastructure/services/TwilioSmsService';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { NotFoundError, ValidationError, ConflictError } from '@/application/errors';
import { ConsentPdfService } from '@/lib/services/consent/ConsentPdfService';

/**
 * Service: ConsentSigningService
 * 
 * Orchestrates the consent signing workflow:
 * - QR code generation
 * - Identity verification
 * - OTP sending and validation
 * - Signature capture
 * - PDF generation
 */
export class ConsentSigningService {
  private readonly qrCodeService: QrCodeService;
  private readonly otpService: OtpService;
  private readonly smsService: TwilioSmsService;
  private readonly pdfService: ConsentPdfService;

  constructor(private readonly prisma: PrismaClient) {
    this.qrCodeService = new QrCodeService();
    this.otpService = new OtpService();
    this.smsService = new TwilioSmsService();
    this.pdfService = new ConsentPdfService();
  }

  /**
   * Creates a signing session and generates QR code for a consent form
   */
  async createSigningSession(
    consentFormId: string,
    requiresStaffVerify: boolean = false,
    expiresInHours: number = 48
  ): Promise<{ qrCode: string; token: string; signingUrl: string; qrCodeDataUrl: string }> {
    // Check if consent form exists
    const consentForm = await this.prisma.consentForm.findUnique({
      where: { id: consentFormId },
      include: { case_plan: { include: { patient: true } } },
    });

    if (!consentForm) {
      throw new NotFoundError('Consent form not found', 'ConsentForm', consentFormId);
    }

    // Check if session already exists
    const existingSession = await this.prisma.consentSigningSession.findUnique({
      where: { consent_form_id: consentFormId },
    });

    if (existingSession && existingSession.status !== 'CANCELLED' && existingSession.status !== 'EXPIRED') {
      throw new ConflictError('Signing session already exists for this consent form');
    }

    // Generate QR code and token
    const qrCode = this.qrCodeService.generateQrCode();
    const token = this.qrCodeService.generateToken();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Determine verification method
    const verificationMethod: VerificationMethod = requiresStaffVerify
      ? 'STAFF_VERIFIED'
      : 'NAME_DOB_OTP';

    // Create or update session
    const session = await this.prisma.consentSigningSession.upsert({
      where: { consent_form_id: consentFormId },
      create: {
        consent_form_id: consentFormId,
        qr_code: qrCode,
        token,
        expires_at: expiresAt,
        verification_method: verificationMethod,
        requires_staff_verify: requiresStaffVerify,
        status: 'PENDING',
      },
      update: {
        qr_code: qrCode,
        token,
        expires_at: expiresAt,
        verification_method: verificationMethod,
        requires_staff_verify: requiresStaffVerify,
        status: 'PENDING',
        verification_attempts: 0,
        failed_attempts: 0,
      },
    });

    // Generate QR code image
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const signingUrl = this.qrCodeService.generateSigningUrl(qrCode, baseUrl);
    const qrCodeDataUrl = await this.qrCodeService.generateDataUrl(signingUrl);

    return {
      qrCode,
      token,
      signingUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Gets consent form and session by QR code (for public signing page)
   */
  async getConsentByQrCode(qrCode: string): Promise<{
    consentForm: ConsentForm;
    session: ConsentSigningSession;
    patientName: string;
  }> {
    const session = await this.prisma.consentSigningSession.findUnique({
      where: { qr_code: qrCode },
      include: {
        consent_form: {
          include: {
            case_plan: {
              include: { patient: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Signing session not found', 'ConsentSigningSession', qrCode);
    }

    // Check expiry
    if (new Date() > session.expires_at) {
      await this.prisma.consentSigningSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
      throw new ValidationError('QR code has expired');
    }

    // Check if already signed
    if (session.status === 'SIGNED') {
      throw new ConflictError('Consent has already been signed');
    }

    const patient = session.consent_form.case_plan.patient;
    const patientName = `${patient.first_name} ${patient.last_name}`;

    return {
      consentForm: session.consent_form,
      session,
      patientName,
    };
  }

  /**
   * Verifies patient identity (name + DOB)
   */
  async verifyIdentity(
    qrCode: string,
    patientName: string,
    dateOfBirth: Date
  ): Promise<{ verified: boolean; requiresOtp: boolean }> {
    const session = await this.prisma.consentSigningSession.findUnique({
      where: { qr_code: qrCode },
      include: {
        consent_form: {
          include: {
            case_plan: {
              include: { patient: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Signing session not found');
    }

    // Check expiry
    if (new Date() > session.expires_at) {
      throw new ValidationError('QR code has expired');
    }

    // Check failed attempts
    if (session.failed_attempts >= 3) {
      throw new ValidationError('Too many failed verification attempts. Please contact your doctor.');
    }

    const patient = session.consent_form.case_plan.patient;
    const patientFullName = `${patient.first_name} ${patient.last_name}`.toLowerCase().trim();
    const enteredName = patientName.toLowerCase().trim();

    // Compare names (case-insensitive)
    const nameMatches = patientFullName === enteredName;

    // Compare DOB (date only, ignore time)
    const patientDob = new Date(patient.date_of_birth);
    const enteredDob = new Date(dateOfBirth);
    const dobMatches =
      patientDob.getFullYear() === enteredDob.getFullYear() &&
      patientDob.getMonth() === enteredDob.getMonth() &&
      patientDob.getDate() === enteredDob.getDate();

    if (!nameMatches || !dobMatches) {
      // Increment failed attempts
      await this.prisma.consentSigningSession.update({
        where: { id: session.id },
        data: {
          failed_attempts: session.failed_attempts + 1,
          verification_attempts: session.verification_attempts + 1,
        },
      });

      throw new ValidationError('Name or date of birth does not match our records');
    }

    // Update session with verified identity
    await this.prisma.consentSigningSession.update({
      where: { id: session.id },
      data: {
        patient_name_entered: patientName,
        patient_dob_entered: dateOfBirth,
        status: 'VERIFIED',
        identity_match_score: 1.0,
        verification_attempts: session.verification_attempts + 1,
      },
    });

    // Check if OTP is required (based on verification method)
    const requiresOtp = session.verification_method === 'NAME_DOB_OTP' || session.verification_method === 'STAFF_VERIFIED';

    return { verified: true, requiresOtp };
  }

  /**
   * Sends OTP to patient's phone
   */
  async sendOTP(qrCode: string): Promise<void> {
    const session = await this.prisma.consentSigningSession.findUnique({
      where: { qr_code: qrCode },
      include: {
        consent_form: {
          include: {
            case_plan: {
              include: { patient: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Signing session not found');
    }

    if (session.status !== 'VERIFIED') {
      throw new ValidationError('Identity must be verified before sending OTP');
    }

    const patient = session.consent_form.case_plan.patient;
    if (!patient.phone) {
      throw new ValidationError('Patient phone number not available');
    }

    // Generate and hash OTP
    const otp = this.otpService.generateOTP();
    const hashedOtp = await this.otpService.hashOTP(otp);
    const expiresAt = this.otpService.calculateExpiry();

    // Update session
    await this.prisma.consentSigningSession.update({
      where: { id: session.id },
      data: {
        otp_code: hashedOtp,
        otp_expires_at: expiresAt,
        otp_sent: true,
        phone_number_used: patient.phone,
      },
    });

    // Send SMS
    try {
      const phoneNumber = PhoneNumber.create(patient.phone);
      await this.smsService.sendOTP(phoneNumber, otp);
    } catch (error) {
      console.error('[ConsentSigningService] Failed to send OTP:', error);
      // Don't throw - OTP is stored, can be manually shared if SMS fails
    }
  }

  /**
   * Validates OTP code
   */
  async validateOTP(qrCode: string, otp: string): Promise<boolean> {
    const session = await this.prisma.consentSigningSession.findUnique({
      where: { qr_code: qrCode },
    });

    if (!session) {
      throw new NotFoundError('Signing session not found');
    }

    if (!session.otp_code || !session.otp_expires_at) {
      throw new ValidationError('OTP not sent for this session');
    }

    // Check expiry
    if (this.otpService.isExpired(session.otp_expires_at)) {
      throw new ValidationError('OTP has expired. Please request a new one.');
    }

    // Validate OTP
    const isValid = await this.otpService.validateOTP(otp, session.otp_code);

    if (isValid) {
      await this.prisma.consentSigningSession.update({
        where: { id: session.id },
        data: {
          otp_verified: true,
          status: 'VERIFIED',
        },
      });
    } else {
      // Increment failed attempts
      await this.prisma.consentSigningSession.update({
        where: { id: session.id },
        data: {
          failed_attempts: session.failed_attempts + 1,
        },
      });
    }

    return isValid;
  }

  /**
   * Submits patient signature
   */
  async submitSignature(
    qrCode: string,
    patientSignature: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; pdfUrl?: string }> {
    const session = await this.prisma.consentSigningSession.findUnique({
      where: { qr_code: qrCode },
      include: {
        consent_form: {
          include: {
            case_plan: {
              include: { patient: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Signing session not found');
    }

    // Check if OTP is required and verified
    if (session.verification_method === 'NAME_DOB_OTP' || session.verification_method === 'STAFF_VERIFIED') {
      if (!session.otp_verified) {
        throw new ValidationError('OTP must be verified before signing');
      }
    }

    // Check if staff verification is required
    if (session.requires_staff_verify && !session.verified_by_staff_id) {
      throw new ValidationError('Staff verification required before signing');
    }

    const signedAt = new Date();
    const patient = session.consent_form.case_plan.patient;
    const patientName = `${patient.first_name} ${patient.last_name}`;

    // Update consent form
    await this.prisma.consentForm.update({
      where: { id: session.consent_form_id },
      data: {
        status: 'SIGNED',
        patient_signature: patientSignature,
        signed_at: signedAt,
        signed_by_ip: ipAddress,
      },
    });

    // Update session
    await this.prisma.consentSigningSession.update({
      where: { id: session.id },
      data: {
        status: 'SIGNED',
        patient_signature: patientSignature,
        signed_at: signedAt,
        signed_by_ip: ipAddress,
        signed_by_user_agent: userAgent,
      },
    });

    // Generate and upload PDF
    let pdfUrl: string | undefined;
    try {
      pdfUrl = await this.pdfService.generateAndUploadPdf({
        consentTitle: session.consent_form.title,
        consentContent: session.consent_form.content_snapshot,
        patientName,
        patientSignature,
        signedAt,
        witnessName: session.witness_name || undefined,
        witnessSignature: session.witness_signature || undefined,
      });
    } catch (error) {
      console.error('[ConsentSigningService] Failed to generate PDF:', error);
      // Don't fail the signing if PDF generation fails
    }

    return { success: true, pdfUrl };
  }

  /**
   * Staff verifies patient identity (for surgical consents)
   */
  async staffVerifyIdentity(
    qrCode: string,
    staffUserId: string,
    note?: string
  ): Promise<void> {
    const session = await this.prisma.consentSigningSession.findUnique({
      where: { qr_code: qrCode },
    });

    if (!session) {
      throw new NotFoundError('Signing session not found');
    }

    if (!session.requires_staff_verify) {
      throw new ValidationError('Staff verification not required for this consent');
    }

    await this.prisma.consentSigningSession.update({
      where: { id: session.id },
      data: {
        verified_by_staff_id: staffUserId,
        verified_by_staff_at: new Date(),
        staff_verification_note: note,
        verification_method: 'STAFF_VERIFIED',
      },
    });
  }
}
