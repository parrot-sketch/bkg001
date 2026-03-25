require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testComplete() {
  const db = new PrismaClient();
  try {
    const q = await db.patientQueue.findMany({
      include: { appointment: true, patient: true, doctor: true }
    });

    console.log(`There are ${q.length} TOTAL queue items in ${process.env.DATABASE_URL}`);
    for (const item of q) {
      console.log(`Queue Item ID: ${item.id}, Status: ${item.status}, ApptID: ${item.appointment_id}, Doctor: ${item.doctor?.name}`);
    }
  } catch (e) {
    console.error("Fatal error:", e);
  } finally {
    await db.$disconnect();
  }
}

testComplete();
