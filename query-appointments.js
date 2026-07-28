const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT a.id, a.status, a.appointment_date, a.time, 
           p.first_name, p.last_name, p.file_number, 
           d.first_name as doctor_first, d.last_name as doctor_last, 
           c.id as consultation_id, c.started_at, c.completed_at 
    FROM "Appointment" a 
    JOIN "Patient" p ON a.patient_id = p.id 
    JOIN "Doctor" d ON a.doctor_id = d.id 
    LEFT JOIN "Consultation" c ON c.appointment_id = a.id 
    ORDER BY a.id;
  `;
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
