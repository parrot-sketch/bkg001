import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { IntakeSession } from '@/domain/entities/IntakeSession';
import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { IntakeSessionMapper } from '@/infrastructure/mappers/IntakeSessionMapper';
import { DomainException } from '@/domain/exceptions/DomainException';

/**
 * Use Case: Start Patient Intake
 *
 * Triggered by: Frontdesk user clicks "New Walk-in Patient"
 * Input: None (session created automatically)
 * Output: Session info with QR code and intake URL
 *
 * Business Flow:
 * 1. Generate unique sessionId (UUID)
 * 2. Create IntakeSession entity
 * 3. Persist to database
 * 4. Generate intake form URL
 * 5. Encode URL as QR code
 * 6. Return DTO with QR code and URL
 */
export class StartPatientIntakeUseCase {
  constructor(
    private readonly intakeSessionRepository: IIntakeSessionRepository,
  ) {}

  async execute(): Promise<{
    sessionId: string;
    qrCodeUrl: string;
    intakeFormUrl: string;
    expiresAt: string;
    minutesRemaining: number;
  }> {
    try {
      // 1. Generate unique session ID
      const sessionId = uuidv4();

      // 2. Create domain entity
      const session = IntakeSession.create({
        sessionId,
        expirationMinutes: 60,
      });

      // 3. Persist to database
      await this.intakeSessionRepository.create(session);

      // 4. Generate intake form URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const intakeFormUrl = `${baseUrl}/patient/intake?sessionId=${sessionId}`;

      // 5. Encode URL as QR code
      const qrCodeUrl = await QRCode.toDataURL(intakeFormUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // 6. Return DTO
      const dto = IntakeSessionMapper.toDto(session, qrCodeUrl);

      return {
        sessionId: dto.sessionId,
        qrCodeUrl: dto.qrCodeUrl,
        intakeFormUrl: dto.intakeFormUrl,
        expiresAt: dto.expiresAt,
        minutesRemaining: session.getMinutesRemaining(),
      };
    } catch (error) {
      if (error instanceof DomainException) {
        throw error;
      }

      throw new Error(`Failed to start patient intake: ${(error as Error).message}`);
    }
  }
}
