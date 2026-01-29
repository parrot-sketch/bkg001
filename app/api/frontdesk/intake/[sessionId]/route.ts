import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PrismaIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { IntakeSubmissionMapper } from '@/infrastructure/mappers/IntakeSubmissionMapper';

/**
 * GET /api/frontdesk/intake/[sessionId]
 *
 * Get detailed intake submission by session ID
 *
 * Response:
 * {
 *   submissionId: "...",
 *   sessionId: "...",
 *   personalInfo: {...},
 *   contactInfo: {...},
 *   emergencyContact: {...},
 *   medicalInfo: {...},
 *   insuranceInfo: {...},
 *   consent: {...},
 *   submittedAt: "...",
 *   status: "PENDING",
 *   completenessScore: 95,
 *   isComplete: true,
 *   incompleteFields?: ["allergies", "occupation"]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params;

    const repository = new PrismaIntakeSubmissionRepository(db);
    const submission = await repository.findBySessionId(sessionId);

    if (!submission) {
      return NextResponse.json(
        { error: 'Intake submission not found' },
        { status: 404 },
      );
    }

    const dto = IntakeSubmissionMapper.toDto(submission);
    
    // Add incomplete fields list
    const primitive = submission.toPrimitive();
    const incompleteFields: string[] = [];
    
    // Check all required fields
    if (!primitive.personalInfo.firstName) incompleteFields.push('First Name');
    if (!primitive.personalInfo.lastName) incompleteFields.push('Last Name');
    if (!primitive.personalInfo.dateOfBirth) incompleteFields.push('Date of Birth');
    if (!primitive.personalInfo.gender) incompleteFields.push('Gender');
    if (!primitive.contactInfo.email) incompleteFields.push('Email');
    if (!primitive.contactInfo.phone) incompleteFields.push('Phone');
    if (!primitive.contactInfo.address) incompleteFields.push('Address');
    if (!primitive.emergencyContact.name) incompleteFields.push('Emergency Contact Name');
    if (!primitive.emergencyContact.phoneNumber) incompleteFields.push('Emergency Contact Phone');
    if (!primitive.emergencyContact.relationship) incompleteFields.push('Emergency Contact Relation');
    if (!primitive.consent.privacyConsent) incompleteFields.push('Privacy Consent');
    if (!primitive.consent.serviceConsent) incompleteFields.push('Service Consent');
    if (!primitive.consent.medicalConsent) incompleteFields.push('Medical Consent');

    return NextResponse.json({
      ...dto,
      incompleteFields: incompleteFields.length > 0 ? incompleteFields : undefined,
    });
  } catch (error) {
    console.error('[GetIntakeSubmission]', error);

    return NextResponse.json(
      { error: 'Failed to fetch intake submission' },
      { status: 500 },
    );
  }
}

