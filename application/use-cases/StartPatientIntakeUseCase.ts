import QRCode from 'qrcode';
import { IntakeSession } from '@/domain/entities/IntakeSession';
import { IIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { v4 as uuidv4 } from 'uuid';

export interface StartIntakeOutput {
  sessionId: string;
  qrCodeUrl: string;
  intakeFormUrl: string;
  expiresAt: string;
  minutesRemaining: number;
}

export class StartPatientIntakeUseCase {
  constructor(
    private readonly sessionRepo: IIntakeSessionRepository,
  ) {}

  async execute(params?: {
    createdByUserId?: string;
    expirationMinutes?: number;
  }): Promise<StartIntakeOutput> {
    const sessionId = uuidv4();

    const session = IntakeSession.create({
      sessionId,
      createdByUserId: params?.createdByUserId,
      expirationMinutes: params?.expirationMinutes ?? 60,
    });

    await this.sessionRepo.create(session);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const intakeFormUrl = `${baseUrl.replace(/\/$/, '')}/intake/${sessionId}`;

    const qrCodeUrl = await QRCode.toDataURL(intakeFormUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    const p = session.toPrimitive();
    return {
      sessionId: p.sessionId,
      qrCodeUrl,
      intakeFormUrl,
      expiresAt: p.expiresAt,
      minutesRemaining: p.minutesRemaining,
    };
  }
}
