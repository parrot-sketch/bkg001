import { PrismaClient } from '@prisma/client';

async function main() {
    // 1. Check Remote DB
    console.log("--- REMOTE DB ---");
    const prisma1 = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL } }
    });
    try {
        const p1 = await prisma1.payment.findMany({ orderBy: { id: 'desc' }, take: 5, include: { patient: true }});
        p1.forEach(p => console.log(`${p.id}: ${p.patient?.first_name} ${p.patient?.last_name} | Total: ${p.total_amount}`));
    } catch(e) { console.log("Remote DB Error:", e.message.substring(0, 100)); }
    finally { await prisma1.$disconnect(); }

    // 2. Check Local DB
    console.log("\n--- LOCAL DB ---");
    const prisma2 = new PrismaClient({
        datasources: { db: { url: "postgresql://postgres:postgres@localhost:5433/nairobi_sculpt?schema=public" } }
    });
    try {
        const p2 = await prisma2.payment.findMany({ orderBy: { id: 'desc' }, take: 5, include: { patient: true }});
        p2.forEach(p => console.log(`${p.id}: ${p.patient?.first_name} ${p.patient?.last_name} | Total: ${p.total_amount} | finalized:`, p.finalized_at));
    } catch(e) { console.log("Local DB Error:", e.message.substring(0, 100)); }
    finally { await prisma2.$disconnect(); }
}

main().catch(console.error);
