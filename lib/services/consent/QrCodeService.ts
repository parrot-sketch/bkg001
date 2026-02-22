import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

/**
 * Service: QrCodeService
 * 
 * Generates QR codes for consent signing sessions.
 * 
 * Responsibilities:
 * - Generate unique QR codes
 * - Create QR code images (data URLs or buffers)
 * - Generate secure tokens for signing sessions
 */
export class QrCodeService {
  /**
   * Generates a unique, short QR code string
   * Format: CONS-XXXXXX (where XXXXXX is random alphanumeric)
   */
  generateQrCode(): string {
    const randomPart = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    return `CONS-${randomPart}`;
  }

  /**
   * Generates a secure token for API access
   */
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generates QR code as data URL (for embedding in HTML)
   * 
   * @param url - URL to encode in QR code
   * @param options - QR code options (size, margin, etc.)
   * @returns Promise resolving to data URL string
   */
  async generateDataUrl(
    url: string,
    options: { width?: number; margin?: number } = {}
  ): Promise<string> {
    const { width = 300, margin = 2 } = options;
    
    try {
      return await QRCode.toDataURL(url, {
        width,
        margin,
        errorCorrectionLevel: 'M',
        type: 'image/png',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate QR code: ${errorMessage}`);
    }
  }

  /**
   * Generates QR code as buffer (for file storage or API responses)
   * 
   * @param url - URL to encode in QR code
   * @param options - QR code options
   * @returns Promise resolving to Buffer
   */
  async generateBuffer(
    url: string,
    options: { width?: number; margin?: number } = {}
  ): Promise<Buffer> {
    const { width = 300, margin = 2 } = options;
    
    try {
      return await QRCode.toBuffer(url, {
        width,
        margin,
        errorCorrectionLevel: 'M',
        type: 'png',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate QR code: ${errorMessage}`);
    }
  }

  /**
   * Generates the signing URL for a QR code
   * 
   * @param qrCode - QR code string
   * @param baseUrl - Base URL of the application (e.g., https://yoursite.com)
   * @returns Full URL for signing page
   */
  generateSigningUrl(qrCode: string, baseUrl: string): string {
    return `${baseUrl}/consent/sign/${qrCode}`;
  }
}
