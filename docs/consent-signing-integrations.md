# Consent Signing: Third-Party Integrations Required

**Date:** January 2025  
**Status:** Integration Requirements Document

## Overview

This document outlines the third-party integrations needed for the consent signing solution, including what's already available, what needs to be added, and alternatives.

## Required Integrations

### 1. SMS/OTP Service ⚠️ **NEW INTEGRATION NEEDED**

**Purpose:** Send OTP codes to patient phone numbers for identity verification

**Options:**

#### Option A: Twilio (Recommended)
- **Service:** Twilio SMS API
- **Cost:** ~$0.0075 per SMS (varies by country)
- **Setup:** 
  - Sign up for Twilio account
  - Get API credentials (Account SID, Auth Token)
  - Purchase phone number (optional, can use trial number for testing)
- **Pros:**
  - ✅ Reliable, global coverage
  - ✅ Good documentation
  - ✅ Supports multiple countries
  - ✅ Easy to integrate
- **Cons:**
  - ❌ Requires paid account (trial available)
  - ❌ Per-SMS pricing

**Integration Code:**
```typescript
// lib/services/sms/TwilioSmsService.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendOTP(phoneNumber: string, code: string): Promise<void> {
  await client.messages.create({
    body: `Your consent verification code is: ${code}. Valid for 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number
    to: phoneNumber,
  });
}
```

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### Option B: AWS SNS (Simple Notification Service)
- **Service:** AWS SNS SMS
- **Cost:** ~$0.00645 per SMS (varies by country)
- **Setup:**
  - AWS account required
  - IAM user with SNS permissions
  - Configure SMS preferences in AWS console
- **Pros:**
  - ✅ Lower cost than Twilio in some regions
  - ✅ Part of AWS ecosystem (if already using AWS)
  - ✅ Good for high volume
- **Cons:**
  - ❌ More complex setup
  - ❌ Requires AWS account and IAM configuration
  - ❌ Less user-friendly than Twilio

**Integration Code:**
```typescript
// lib/services/sms/AwsSnsService.ts
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendOTP(phoneNumber: string, code: string): Promise<void> {
  await snsClient.send(new PublishCommand({
    PhoneNumber: phoneNumber,
    Message: `Your consent verification code is: ${code}. Valid for 10 minutes.`,
  }));
}
```

#### Option C: Local SMS Gateway (If Available)
- **Service:** Local SMS provider (country-specific)
- **Cost:** Varies by provider
- **Setup:** Provider-specific
- **Pros:**
  - ✅ May be cheaper for local numbers
  - ✅ Better delivery rates in some regions
- **Cons:**
  - ❌ Limited to specific countries
  - ❌ Less standardized API

**Recommendation:** Start with **Twilio** (easiest setup, good documentation, reliable)

---

### 2. QR Code Generation ✅ **ALREADY AVAILABLE**

**Purpose:** Generate QR codes for consent signing sessions

**Status:** ✅ Already in `package.json`
- Package: `qrcode` (v1.5.4)
- Types: `@types/qrcode` (v1.5.6)

**No additional integration needed** - we can use the existing package.

**Usage:**
```typescript
import QRCode from 'qrcode';

// Generate QR code as data URL
const qrCodeDataUrl = await QRCode.toDataURL(`https://yoursite.com/consent/sign/${qrCode}`, {
  width: 300,
  margin: 2,
});

// Or generate as buffer
const qrCodeBuffer = await QRCode.toBuffer(`https://yoursite.com/consent/sign/${qrCode}`);
```

---

### 3. PDF Generation ⚠️ **NEW INTEGRATION NEEDED**

**Purpose:** Generate signed consent PDFs with patient signature embedded

**Options:**

#### Option A: @react-pdf/renderer (Recommended for React/Next.js)
- **Package:** `@react-pdf/renderer`
- **Cost:** Free (open source)
- **Setup:**
  - Install package: `pnpm add @react-pdf/renderer`
  - Create React components for PDF layout
- **Pros:**
  - ✅ React-based (fits Next.js stack)
  - ✅ Component-based (easy to maintain)
  - ✅ Good for structured documents
  - ✅ Free and open source
- **Cons:**
  - ❌ Limited styling options
  - ❌ Can be slow for complex layouts
  - ❌ Server-side rendering required

**Integration Code:**
```typescript
// lib/services/pdf/ConsentPdfGenerator.ts
import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 12 },
  title: { fontSize: 18, marginBottom: 20 },
  content: { marginBottom: 20 },
  signature: { marginTop: 40, borderTop: '1px solid #000', paddingTop: 10 },
});

export async function generateSignedConsentPdf(
  consentContent: string,
  patientSignature: string, // Base64 image
  patientName: string,
  signedAt: Date
): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Consent Form</Text>
        <View style={styles.content}>
          {/* Render consent content */}
        </View>
        <View style={styles.signature}>
          <Image src={patientSignature} style={{ width: 200, height: 80 }} />
          <Text>Signed by: {patientName}</Text>
          <Text>Date: {signedAt.toLocaleDateString()}</Text>
        </View>
      </Page>
    </Document>
  );

  const pdfBlob = await pdf(doc).toBlob();
  return Buffer.from(await pdfBlob.arrayBuffer());
}
```

#### Option B: PDFKit
- **Package:** `pdfkit`
- **Cost:** Free (open source)
- **Setup:**
  - Install: `pnpm add pdfkit`
- **Pros:**
  - ✅ More control over layout
  - ✅ Better for complex documents
  - ✅ Can embed images easily
- **Cons:**
  - ❌ More verbose API
  - ❌ Not React-based

**Integration Code:**
```typescript
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

export async function generateSignedConsentPdf(
  consentContent: string,
  patientSignature: string,
  patientName: string,
  signedAt: Date
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.text('Consent Form', { fontSize: 18 });
    doc.moveDown();
    doc.text(consentContent);
    doc.moveDown(2);
    
    // Add signature image
    const signatureBuffer = Buffer.from(patientSignature, 'base64');
    doc.image(signatureBuffer, { width: 200, height: 80 });
    doc.text(`Signed by: ${patientName}`);
    doc.text(`Date: ${signedAt.toLocaleDateString()}`);

    doc.end();
  });
}
```

#### Option C: Puppeteer (HTML to PDF)
- **Package:** `puppeteer`
- **Cost:** Free (but requires Chrome/Chromium)
- **Setup:**
  - Install: `pnpm add puppeteer`
  - Requires Chrome/Chromium binary
- **Pros:**
  - ✅ Can render HTML/CSS directly
  - ✅ Good for complex layouts
- **Cons:**
  - ❌ Heavy dependency (Chromium binary)
  - ❌ Slower than other options
  - ❌ Overkill for simple PDFs

**Recommendation:** Use **@react-pdf/renderer** (fits React stack, component-based, free)

---

### 4. Cloud Storage ✅ **ALREADY AVAILABLE**

**Purpose:** Store signed consent PDFs and signature images

**Status:** ✅ Already integrated (Cloudinary)
- Package: `cloudinary` (v1.41.0)
- Already used in `/app/api/upload/route.ts`

**No additional integration needed** - we can use existing Cloudinary setup.

**Usage:**
```typescript
// Reuse existing Cloudinary config
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload signed PDF
const result = await cloudinary.uploader.upload(pdfBuffer, {
  folder: 'consent_forms',
  resource_type: 'raw',
  format: 'pdf',
});
```

---

### 5. Signature Capture ✅ **NATIVE (NO INTEGRATION)**

**Purpose:** Capture patient signature on canvas

**Status:** ✅ Native browser API (HTML5 Canvas)
- No third-party library needed
- Canvas API is built into browsers

**Implementation:**
```typescript
// components/consent/SignaturePad.tsx
// Uses native Canvas API - no dependencies needed
```

---

## Summary Table

| Integration | Status | Package/Service | Cost | Setup Complexity |
|------------|--------|----------------|------|------------------|
| **SMS/OTP** | ⚠️ **NEW** | Twilio (recommended) | ~$0.0075/SMS | Medium |
| **QR Code** | ✅ **EXISTS** | `qrcode` (v1.5.4) | Free | None |
| **PDF Generation** | ⚠️ **NEW** | `@react-pdf/renderer` | Free | Low |
| **Cloud Storage** | ✅ **EXISTS** | Cloudinary (v1.41.0) | Free tier available | None |
| **Signature Capture** | ✅ **NATIVE** | Canvas API | Free | None |

## Required Environment Variables

### New Variables Needed:

```env
# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Or AWS SNS (alternative)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### Existing Variables (Already Configured):

```env
# Cloudinary (already set up)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Package Installation

### New Packages Needed:

```bash
# SMS Service (Twilio)
pnpm add twilio

# PDF Generation
pnpm add @react-pdf/renderer

# TypeScript types (if needed)
pnpm add -D @types/twilio
```

### Already Installed:

```bash
# QR Code (already in package.json)
qrcode@^1.5.4
@types/qrcode@^1.5.6

# Cloud Storage (already in package.json)
cloudinary@^1.41.0
```

## Implementation Phases

### Phase 1: SMS Integration (Critical)
- **Priority:** High (required for OTP verification)
- **Service:** Twilio (recommended)
- **Tasks:**
  1. Sign up for Twilio account
  2. Get API credentials
  3. Install `twilio` package
  4. Create `SmsService` abstraction
  5. Implement OTP sending
  6. Add environment variables
  7. Test with trial account

### Phase 2: PDF Generation (Important)
- **Priority:** Medium (needed for signed consent storage)
- **Package:** `@react-pdf/renderer`
- **Tasks:**
  1. Install `@react-pdf/renderer`
  2. Create PDF template components
  3. Implement PDF generation service
  4. Integrate with Cloudinary upload
  5. Test PDF generation

### Phase 3: QR Code (Already Available)
- **Priority:** Low (package already installed)
- **Tasks:**
  1. Create QR code generation service
  2. Integrate with consent creation
  3. Test QR code generation

## Cost Estimation

### Twilio SMS (Example: 100 consents/month)
- **OTP per consent:** 1 SMS
- **Total SMS:** 100/month
- **Cost:** 100 × $0.0075 = **$0.75/month**

### Cloudinary Storage (Example: 100 signed PDFs/month)
- **PDF size:** ~500KB each
- **Total storage:** 50MB/month
- **Cost:** Free tier covers 25GB storage, 25GB bandwidth
- **Cost:** **$0/month** (within free tier)

### PDF Generation
- **Cost:** **$0** (open source library)

**Total Estimated Cost:** ~**$0.75-1.50/month** for 100 consents (mostly SMS)

## Alternatives & Fallbacks

### SMS Fallback Options:

1. **Email OTP** (if phone not available)
   - Send OTP via email instead
   - Less secure but better than nothing
   - Use existing email service

2. **WhatsApp Business API** (if available)
   - More reliable in some regions
   - Better delivery rates
   - Requires WhatsApp Business account

3. **Skip OTP for Low-Risk Consents**
   - Use only name + DOB verification
   - Acceptable for non-surgical consents
   - Document in audit trail

### PDF Generation Fallback:

1. **Store HTML + Signature Image**
   - Don't generate PDF immediately
   - Store HTML content + signature separately
   - Generate PDF on-demand or later

2. **Use Cloudinary PDF Generation**
   - Cloudinary can convert HTML to PDF
   - No additional library needed
   - Requires Cloudinary account upgrade

## Security Considerations

### SMS Security:
- ✅ OTP codes expire (5-10 minutes)
- ✅ One-time use (invalid after verification)
- ✅ Rate limiting (max 3 requests per session)
- ✅ Log all SMS sends (audit trail)

### PDF Security:
- ✅ Signed PDFs stored in Cloudinary (secure)
- ✅ Access control via signed URLs (if needed)
- ✅ Audit trail of all PDF generations

## Next Steps

1. **Choose SMS Provider:** Twilio (recommended) or AWS SNS
2. **Set up Twilio Account:** Get API credentials
3. **Install Packages:** `twilio`, `@react-pdf/renderer`
4. **Create Services:** `SmsService`, `PdfGeneratorService`
5. **Add Environment Variables:** Twilio credentials
6. **Test Integration:** Send test OTP, generate test PDF

## Questions to Resolve

1. **SMS Provider Preference:** Twilio, AWS SNS, or local provider?
2. **PDF Generation:** @react-pdf/renderer or PDFKit?
3. **OTP Fallback:** Email OTP if phone unavailable?
4. **Cost Budget:** Acceptable monthly cost for SMS?
