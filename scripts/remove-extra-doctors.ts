
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeExtraDoctors() {
    console.log('🧹 Removing extra doctors from production...');
    
    const extraDoctorEmails = [
        'omondi.odir@nairobisculpt.com',
        'ochala@nairobisculpt.com',
        'areeb@nairobisculpt.com',
        'robert.mugo@nairobisculpt.com',
        'daniel@nairobisculpt.com'
    ];
    
    for (const email of extraDoctorEmails) {
        console.log(`Processing ${email}...`);
        
        const user = await prisma.user.findUnique({
            where: { email },
            include: { doctor_profile: true }
        });
        
        if (user) {
            const userId = user.id;
            
            // 1. Unassign patients
            const updatedPatients = await prisma.patient.updateMany({
                where: { assigned_to_user_id: userId },
                data: { assigned_to_user_id: null }
            });
            console.log(`   - Unassigned ${updatedPatients.count} patients.`);
            
            // 2. Delete doctor profile if exists
            if (user.doctor_profile) {
                await prisma.doctor.delete({
                    where: { id: user.doctor_profile.id }
                });
                console.log(`   - Deleted doctor profile.`);
            }
            
            // 3. Delete user record
            await prisma.user.delete({
                where: { id: userId }
            });
            console.log(`   - Deleted user record.`);
            
            console.log(`✅ Removed ${email}.`);
        } else {
            console.log(`⚠️  User with email ${email} not found.`);
        }
    }
    
    // Final count check
    const doctorCount = await prisma.doctor.count();
    console.log(`\nFinal Doctor Count: ${doctorCount}`);
}

removeExtraDoctors()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
