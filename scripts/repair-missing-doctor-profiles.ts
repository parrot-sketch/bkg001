import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Debugging User Roles...');

    const userId = 'cf9977b9-388f-4171-816f-372734165424';

    // 1. Fetch specific user directly
    const specificUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { doctor_profile: true }
    });

    if (specificUser) {
        console.log(`\nfound Target User:`);
        console.log(`- ID: ${specificUser.id}`);
        console.log(`- Role: ${specificUser.role}`);
        console.log(`- Has Profile: ${!!specificUser.doctor_profile}`);

        // Repair if needed
        if (!specificUser.doctor_profile && specificUser.role === 'DOCTOR') {
            console.log('Attemping repair for target user...');
            await repairUser(specificUser);
        }
    } else {
        console.log(`\n❌ Target user ${userId} NOT FOUND in DB.`);
    }

    // 2. Fetch all users to see what's in there
    const allUsers = await prisma.user.findMany({ take: 5 });
    console.log('\nSample Users in DB:');
    allUsers.forEach(u => console.log(`- ${u.email} (${u.role})`));
}

async function repairUser(user: any) {
    const tempLicense = `FIXED-${Date.now().toString().slice(-6)}`;
    try {
        await prisma.doctor.create({
            data: {
                user_id: user.id,
                email: user.email,
                first_name: user.first_name || 'Doctor',
                last_name: user.last_name || 'User',
                name: `${user.first_name || 'Dr.'} ${user.last_name || 'User'}`,
                phone: user.phone || '0000000000',
                specialization: 'General Practice',
                license_number: tempLicense,
                address: 'Clinic Address',
                onboarding_status: 'ACTIVE',
                availability_status: 'AVAILABLE',
                type: 'FULL',
            },
        });
        console.log(`✅ FIXED profile for ${user.email}`);
    } catch (e) {
        console.error(`❌ Failed to fix ${user.email}:`, e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
