/**
 * Clear Test Data Script
 * 
 * Deletes all test data while preserving:
 * - Patients
 * - Inventory items
 * - Doctors
 * - Services
 * - All Users (including doctors and staff)
 * 
 * Run with: npx tsx prisma/clear-test-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('Clearing test data...\n');

  // Delete in correct order respecting foreign keys
  console.log('Deleting surgical/clinical data...');
  
  await prisma.surgicalMedicationRecord.deleteMany({});
  await prisma.clinicalFormResponse.deleteMany({});
  await prisma.clinicalFormTemplate.deleteMany({});
  await prisma.clinicalAuditEvent.deleteMany({});
  await prisma.calendarEvent.deleteMany({});
  await prisma.surgicalBillingLineItem.deleteMany({});
  await prisma.surgicalBillingEstimate.deleteMany({});
  await prisma.surgicalCaseTeamMember.deleteMany({});
  await prisma.surgicalCaseItem.deleteMany({});
  await prisma.surgicalChecklist.deleteMany({});
  await prisma.theaterBooking.deleteMany({});
  await prisma.surgicalCaseProcedure.deleteMany({});
  await prisma.surgicalCase.deleteMany({});
  
  console.log('Deleting consent/case plan data...');
  
  await prisma.consentSigningSession.deleteMany({});
  await prisma.consentFormDocument.deleteMany({});
  await prisma.consentForm.deleteMany({});
  await prisma.casePlanPlannedItem.deleteMany({});
  await prisma.casePlan.deleteMany({});
  await prisma.surgicalStaff.deleteMany({});
  await prisma.surgicalProcedureRecord.deleteMany({});
  await prisma.staffInvite.deleteMany({});
  
  console.log('Deleting consultation data...');
  
  await prisma.consultationMessage.deleteMany({});
  await prisma.consultationAttachment.deleteMany({});
  await prisma.doctorConsultation.deleteMany({});
  await prisma.consultation.deleteMany({});
  
  console.log('Deleting clinical/medical records...');
  
  await prisma.clinicalTask.deleteMany({});
  await prisma.patientImage.deleteMany({});
  await prisma.surgicalOutcome.deleteMany({});
  await prisma.clinicalNoteTemplate.deleteMany({});
  await prisma.diagnosis.deleteMany({});
  await prisma.labTest.deleteMany({});
  await prisma.medicalRecord.deleteMany({});
  await prisma.vitalSign.deleteMany({});
  await prisma.clinicalNote.deleteMany({});
  await prisma.careNote.deleteMany({});
  
  console.log('Deleting appointments & queues...');
  
  await prisma.nurseAssignment.deleteMany({});
  await prisma.patientQueue.deleteMany({});
  await prisma.appointment.deleteMany({});
  
  console.log('Deleting payments & bills...');
  
  await prisma.patientBill.deleteMany({});
  await prisma.payment.deleteMany({});
  
  console.log('Deleting inventory transactions...');
  
  await prisma.inventoryUsage.deleteMany({});
  await prisma.inventoryAuditEvent.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.inventoryBatch.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.goodsReceiptItem.deleteMany({});
  await prisma.goodsReceipt.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  
  console.log('Deleting ratings & notifications...');
  
  await prisma.rating.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.outboxEvent.deleteMany({});
  await prisma.auditLog.deleteMany({});
  
  console.log('Deleting patient intake data...');
  
  await prisma.intakeSubmission.deleteMany({});
  await prisma.intakeSession.deleteMany({});
  
  console.log('Deleting doctor assignments...');
  
  await prisma.doctorPatientAssignment.deleteMany({});
  
  console.log('Deleting availability/schedule data...');
  
  await prisma.scheduleBlock.deleteMany({});
  await prisma.availabilitySlot.deleteMany({});
  await prisma.availabilityTemplate.deleteMany({});
  await prisma.availabilityOverride.deleteMany({});
  await prisma.slotConfiguration.deleteMany({});
  
  console.log('Deleting authentication data...');
  
  await prisma.loginAttempt.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  
  console.log('Deleting consent template versions...');
  
  await prisma.consentTemplateRelease.deleteMany({});
  await prisma.consentTemplateAudit.deleteMany({});
  await prisma.consentTemplateVersion.deleteMany({});
  await prisma.consentTemplate.deleteMany({});
  
  console.log('\n✓ Test data cleared successfully!');
  
  // Show remaining counts
  console.log('\n=== Remaining Data Counts ===');
  console.log(`Users: ${await prisma.user.count()}`);
  console.log(`Patients: ${await prisma.patient.count()}`);
  console.log(`Doctors: ${await prisma.doctor.count()}`);
  console.log(`Services: ${await prisma.service.count()}`);
  console.log(`Inventory Items: ${await prisma.inventoryItem.count()}`);
  console.log(`Vendors: ${await prisma.vendor.count()}`);
  console.log(`Theaters: ${await prisma.theater.count()}`);
  
  await prisma.$disconnect();
}

clearTestData().catch(console.error);