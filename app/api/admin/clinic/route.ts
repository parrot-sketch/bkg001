import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
    const user = await getCurrentUser();

    // Strict Admin Check
    if (!user || user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const clinic = await db.clinic.findFirst();
        return NextResponse.json(clinic);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch clinic settings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const user = await getCurrentUser();

    if (!user || user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, address, phone, email, website, primary_color, accent_color } = body;

        // Update singleton or create if missing
        const existing = await db.clinic.findFirst();

        if (existing) {
            const updated = await db.clinic.update({
                where: { id: existing.id },
                data: { name, address, phone, email, website, primary_color, accent_color }
            });
            return NextResponse.json(updated);
        } else {
            const created = await db.clinic.create({
                data: { name, address, phone, email, website, primary_color, accent_color }
            });
            return NextResponse.json(created);
        }
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update clinic settings' }, { status: 500 });
    }
}
