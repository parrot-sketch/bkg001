import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Inserting NURSE_INTRAOP_RECORD version 2 template...');

    await prisma.clinicalFormTemplate.upsert({
        where: { key_version: { key: 'NURSE_INTRAOP_RECORD', version: 2 } },
        update: { is_active: true },
        create: {
            key: 'NURSE_INTRAOP_RECORD',
            version: 2,
            title: 'Intra-Operative Nurse Record (V2 Redesign)',
            role_owner: Role.NURSE,
            schema_json: '{}',
            ui_json: '{}',
            is_active: true,
        }
    });

    console.log('✅ Version 2 template inserted/verified.');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
