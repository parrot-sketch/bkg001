/**
 * Service: ConsentPdfService
 * 
 * Generates PDF documents for signed consent forms.
 * 
 * Responsibilities:
 * - Generate PDF from consent content
 * - Embed patient signature
 * - Include metadata (patient name, signing date, etc.)
 * - Upload to Cloudinary for storage
 * 
 * Note: This service uses @react-pdf/renderer for PDF generation.
 * The PDF is generated server-side using React components.
 */

import React from 'react';
import { uploadStream } from '../../cloudinary';

export interface SignedConsentPdfData {
  consentTitle: string;
  consentContent: string; // HTML or plain text
  patientName: string;
  patientSignature: string; // Base64 image
  signedAt: Date;
  witnessName?: string;
  witnessSignature?: string; // Base64 image
}

export class ConsentPdfService {
  /**
   * Generates a PDF buffer from signed consent data
   * 
   * @param data - Signed consent data
   * @returns Promise resolving to PDF buffer
   */
  async generatePdf(data: SignedConsentPdfData): Promise<Buffer> {
    try {
      // Dynamic import to handle case where @react-pdf/renderer is not installed
      const { Document, Page, Text, View, Image, StyleSheet, pdf } = await import('@react-pdf/renderer');

      const styles = StyleSheet.create({
        page: {
          padding: 40,
          fontSize: 11,
          fontFamily: 'Helvetica',
        },
        title: {
          fontSize: 18,
          marginBottom: 20,
          fontWeight: 'bold',
        },
        content: {
          marginBottom: 30,
          lineHeight: 1.5,
        },
        signatureSection: {
          marginTop: 40,
          borderTop: '1px solid #000',
          paddingTop: 20,
        },
        signatureRow: {
          marginBottom: 15,
        },
        signatureLabel: {
          fontSize: 10,
          marginBottom: 5,
        },
        signatureImage: {
          width: 200,
          height: 80,
          marginBottom: 10,
        },
        signatureText: {
          fontSize: 10,
        },
      });

      // Convert base64 signature to data URL if needed
      const patientSignatureDataUrl = data.patientSignature.startsWith('data:')
        ? data.patientSignature
        : `data:image/png;base64,${data.patientSignature}`;

      const witnessSignatureDataUrl = data.witnessSignature?.startsWith('data:')
        ? data.witnessSignature
        : data.witnessSignature
        ? `data:image/png;base64,${data.witnessSignature}`
        : undefined;

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>{data.consentTitle}</Text>
            
            <View style={styles.content}>
              {/* Render consent content - if HTML, strip tags for now */}
              <Text>{this.stripHtmlTags(data.consentContent)}</Text>
            </View>

            <View style={styles.signatureSection}>
              <View style={styles.signatureRow}>
                <Text style={styles.signatureLabel}>Patient Signature:</Text>
                <Image src={patientSignatureDataUrl} style={styles.signatureImage} />
                <Text style={styles.signatureText}>
                  {data.patientName}
                </Text>
                <Text style={styles.signatureText}>
                  Date: {data.signedAt.toLocaleDateString()} {data.signedAt.toLocaleTimeString()}
                </Text>
              </View>

              {data.witnessName && witnessSignatureDataUrl && (
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Witness Signature:</Text>
                  <Image src={witnessSignatureDataUrl} style={styles.signatureImage} />
                  <Text style={styles.signatureText}>
                    {data.witnessName}
                  </Text>
                  <Text style={styles.signatureText}>
                    Date: {data.signedAt.toLocaleDateString()} {data.signedAt.toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
          </Page>
        </Document>
      );

      const pdfBlob = await pdf(doc).toBlob();
      return Buffer.from(await pdfBlob.arrayBuffer());
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        throw new Error('@react-pdf/renderer package not installed. Run: pnpm add @react-pdf/renderer');
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate PDF: ${errorMessage}`);
    }
  }

  /**
   * Uploads a PDF buffer to Cloudinary
   * 
   * @param pdfBuffer - PDF buffer to upload
   * @param folder - Cloudinary folder path
   * @param publicId - Optional public ID for the file
   * @returns Promise resolving to Cloudinary upload result
   */
  async uploadPdf(
    pdfBuffer: Buffer,
    folder: string = 'consent_forms',
    publicId?: string
  ): Promise<{ url: string; publicId: string }> {
    const result = await uploadStream(pdfBuffer, {
      folder,
      public_id: publicId,
      resource_type: 'raw',
      format: 'pdf',
    });

    return {
      url: result.secure_url,
      publicId: result.publicId,
    };
  }

  /**
   * Generates PDF and uploads to Cloudinary in one step
   * 
   * @param data - Signed consent data
   * @param folder - Cloudinary folder path
   * @returns Promise resolving to Cloudinary URL
   */
  async generateAndUploadPdf(
    data: SignedConsentPdfData,
    folder: string = 'consent_forms'
  ): Promise<string> {
    const pdfBuffer = await this.generatePdf(data);
    const result = await this.uploadPdf(pdfBuffer, folder);
    return result.url;
  }

  /**
   * Strips HTML tags from content (simple implementation)
   * For production, consider using a proper HTML-to-text converter
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
}
