require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testAssignments() {
  const db = new PrismaClient();
  try {
    const assignments = await db.doctorPatientAssignment.findMany();
    console.log(`Total assignments in DB: ${assignments.length}`);
    for(const a of assignments) {
      console.log(`- Doctor ${a.doctor_id} | Patient ${a.patient_id} | Status: ${a.status}`);
    }
  } catch (e) {
    console.error("Fatal error:", e);
  } finally {
    await db.$disconnect();
  }
}

testAssignments();
