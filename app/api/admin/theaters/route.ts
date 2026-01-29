import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { Role } from '@prisma/client';

export async function GET(request: Request) {
    const user = await getCurrentUser();

    if (!user || user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const theaters = await db.theater.findMany({
        orderBy: { name: 'asc' }
    });

    return NextResponse.json(theaters);
}

export async function POST(request: Request) {
    const user = await getCurrentUser();

    if (!user || user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, type, color_code, notes } = body;

        const theater = await db.theater.create({
            data: {
                name,
                type,
                color_code,
                notes,
                status: 'ACTIVE'
            }
        });

        return NextResponse.json(theater);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create theater' }, { status: 500 });
    }
}
