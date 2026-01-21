/**
 * Email Templates
 * 
 * Professional email templates for clinical notifications.
 * All templates are HTML-formatted with plain text fallback.
 */

export interface EmailTemplateData {
  patientName?: string;
  appointmentDate?: Date;
  appointmentTime?: string;
  doctorName?: string;
  procedureType?: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Consultation Request Received Template
 */
export function consultationRequestReceivedTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = 'Consultation Request Received - Nairobi Sculpt';
  const patientName = data.patientName || 'Patient';
  const requestId = data.requestId || 'N/A';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nairobi Sculpt</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Surgical Aesthetic Clinic</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Consultation Request Received</h2>
          <p>Dear ${patientName},</p>
          <p>Thank you for your interest in our services. We have received your consultation request and our clinical team will review it shortly.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; font-weight: 600;">Request ID: <span style="font-family: monospace;">${requestId}</span></p>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Keep this ID for your records</p>
          </div>

          <h3 style="color: #333; margin-top: 30px;">What happens next?</h3>
          <ul style="color: #555;">
            <li>Our clinical team will review your request within 24 hours</li>
            <li>We'll contact you via phone or email to confirm availability</li>
            <li>Once confirmed, you'll receive appointment details</li>
          </ul>

          <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>Nairobi Sculpt Clinical Team</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Consultation Request Received - Nairobi Sculpt

Dear ${patientName},

Thank you for your interest in our services. We have received your consultation request and our clinical team will review it shortly.

Request ID: ${requestId}

What happens next?
- Our clinical team will review your request within 24 hours
- We'll contact you via phone or email to confirm availability
- Once confirmed, you'll receive appointment details

If you have any questions, please don't hesitate to contact us.

Best regards,
Nairobi Sculpt Clinical Team
  `.trim();

  return { subject, html, text };
}

/**
 * Appointment Booked Template
 */
export function appointmentBookedTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = 'Appointment Confirmed - Nairobi Sculpt';
  const patientName = data.patientName || 'Patient';
  const appointmentDate = data.appointmentDate ? new Date(data.appointmentDate) : new Date();
  const appointmentTime = data.appointmentTime || 'TBD';
  const doctorName = data.doctorName || 'Your Doctor';
  const procedureType = data.procedureType || 'Consultation';

  const formattedDate = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nairobi Sculpt</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Surgical Aesthetic Clinic</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Appointment Confirmed</h2>
          <p>Dear ${patientName},</p>
          <p>Your appointment has been successfully scheduled. We look forward to seeing you.</p>
          
          <div style="background-color: white; padding: 25px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #333;">Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 120px;">Date:</td>
                <td style="padding: 8px 0; font-weight: 600;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Time:</td>
                <td style="padding: 8px 0; font-weight: 600;">${appointmentTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Doctor:</td>
                <td style="padding: 8px 0; font-weight: 600;">${doctorName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Type:</td>
                <td style="padding: 8px 0; font-weight: 600;">${procedureType}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="margin-top: 0; color: #1e40af;">Important Reminders</h3>
            <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
              <li>You'll receive email and SMS reminders 24 hours before your appointment</li>
              <li>Please arrive 15 minutes early for check-in</li>
              <li>Bring a valid ID and insurance card (if applicable)</li>
            </ul>
          </div>

          <p style="margin-top: 30px;">If you need to reschedule or have any questions, please contact us as soon as possible.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>Nairobi Sculpt Clinical Team</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Appointment Confirmed - Nairobi Sculpt

Dear ${patientName},

Your appointment has been successfully scheduled. We look forward to seeing you.

Appointment Details:
Date: ${formattedDate}
Time: ${appointmentTime}
Doctor: ${doctorName}
Type: ${procedureType}

Important Reminders:
- You'll receive email and SMS reminders 24 hours before your appointment
- Please arrive 15 minutes early for check-in
- Bring a valid ID and insurance card (if applicable)

If you need to reschedule or have any questions, please contact us as soon as possible.

Best regards,
Nairobi Sculpt Clinical Team
  `.trim();

  return { subject, html, text };
}

/**
 * Consultation Completed Template
 */
export function consultationCompletedTemplate(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = 'Consultation Completed - Nairobi Sculpt';
  const patientName = data.patientName || 'Patient';
  const appointmentDate = data.appointmentDate ? new Date(data.appointmentDate) : new Date();
  const outcome = data.outcome || 'Consultation completed successfully';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nairobi Sculpt</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Surgical Aesthetic Clinic</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Consultation Completed</h2>
          <p>Dear ${patientName},</p>
          <p>Your consultation on ${appointmentDate.toLocaleDateString()} has been completed.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #333;">Outcome</h3>
            <p style="color: #555;">${outcome}</p>
          </div>

          <p style="margin-top: 30px;">If you have any questions about your consultation or next steps, please don't hesitate to contact us.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            Best regards,<br>
            <strong>Nairobi Sculpt Clinical Team</strong>
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Consultation Completed - Nairobi Sculpt

Dear ${patientName},

Your consultation on ${appointmentDate.toLocaleDateString()} has been completed.

Outcome:
${outcome}

If you have any questions about your consultation or next steps, please don't hesitate to contact us.

Best regards,
Nairobi Sculpt Clinical Team
  `.trim();

  return { subject, html, text };
}
