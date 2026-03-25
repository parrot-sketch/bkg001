import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function cleanupTestData() {
  console.info('Starting selective test data cleanup...');

  try {
    // 1. Disable foreign key checks for the session to allow selective truncation
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;

    const tablesToTruncate = [
      // Clinical / Patient Transactional Data
      'Patient',
      'Appointment',
      'Consultation',
      'DoctorConsultation',
      'PatientQueue',
      'VitalSign',
      'MedicalRecord',
      'Diagnosis',
      'LabTest',
      'CareNote',
      'NurseAssignment',
      'PatientImage',
      'SurgicalCase',
      'CasePlan',
      'CasePlanPlannedItem',
      'DoctorPatientAssignment',
      'SurgicalProcedureRecord',
      'SurgicalStaff',
      'SurgicalChecklist',
      'StaffInvite',
      'ConsentForm',
      'ConsentFormDocument',
      'ConsentSigningSession',
      'SurgicalOutcome',
      'Rating',
      'intake_submission',
      'intake_session',
      'PatientBill',
      'Payment',
      'SurgicalMedicationRecord',
      'ClinicalTask',
      'ClinicalFormResponse',
      'ConsultationAttachment',
      'ConsultationMessage',
      'SurgicalCaseTeamMember',
      'TheaterBooking',

      // Inventory Stock Movements (Transaction data)
      'InventoryUsage',
      'InventoryBatch',
      'StockAdjustment',
      'PurchaseOrder',
      'PurchaseOrderItem',
      'GoodsReceipt',
      'GoodsReceiptItem',

      // Logs & Events
      'AuditLog',
      'ClinicalAuditEvent',
      'InventoryAuditEvent',
      'Notification',
      'OutboxEvent',
      'RefreshToken'
    ];

    for (const table of tablesToTruncate) {
      console.info(`Clearing table: ${table}...`);
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      } catch (err) {
        console.warn(`Could not truncate ${table}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Remove Users with role 'PATIENT'
    console.info('Removing patient users (preserving Doctors and Staff)...');
    const deleteUsersResult = await prisma.user.deleteMany({
      where: {
        role: 'PATIENT'
      }
    });
    console.info(`Removed ${deleteUsersResult.count} patient users.`);

    // 3. Re-enable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = 'origin';`;

    console.info('Selective cleanup completed successfully.');
    
    // 4. Summarize Preserved Data
    const serviceCount = await prisma.service.count();
    const inventoryCount = await prisma.inventoryItem.count();
    const doctorCount = await prisma.doctor.count();
    const staffCount = await prisma.user.count();

    console.info('-----------------------------------');
    console.info('Preservation Summary:');
    console.info(`- Services: ${serviceCount}`);
    console.info(`- Inventory Items: ${inventoryCount}`);
    console.info(`- Doctors: ${doctorCount}`);
    console.info(`- Total Staff Users: ${staffCount} (Doctors, Nurses, Admin, etc.)`);
    console.info('-----------------------------------');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();
