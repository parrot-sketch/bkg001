/**
 * GET /api/theater-tech/surgical-cases/list
 * 
 * Returns all surgical cases for theater tech (with filtering and pagination)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const search = searchParams.get('search') || '';
        const pageSize = 20;

        const where: any = {};
        
        if (status) {
            const statusValues = status.split(',');
            where.status = { in: statusValues };
        }
        
        if (search) {
            where.OR = [
                { patient: { first_name: { contains: search, mode: 'insensitive' } } },
                { patient: { last_name: { contains: search, mode: 'insensitive' } } },
                { patient: { file_number: { contains: search, mode: 'insensitive' } } },
                { procedure_name: { contains: search, mode: 'insensitive' } },
            ];
        }

        const cases = await db.surgicalCase.findMany({
            where,
            include: {
                patient: {
                    select: { id: true, first_name: true, last_name: true, file_number: true },
                },
                primary_surgeon: {
                    select: { name: true },
                },
            },
            orderBy: { created_at: 'desc' },
            take: pageSize,
            skip: (page - 1) * pageSize,
        });

        return NextResponse.json({ success: true, data: cases });
    } catch (error) {
        console.error('Error fetching surgical cases:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch cases' }, { status: 500 });
    }
}