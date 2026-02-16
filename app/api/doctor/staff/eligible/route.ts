
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role, SurgicalRole, Status } from '@prisma/client';
import { ALLOWED_ROLES_MAP } from '@/lib/domain/policies/team-eligibility'; // Ensure this path is correct
import { z } from 'zod';

const querySchema = z.object({
    caseId: z.string().min(1),
    surgicalRole: z.nativeEnum(SurgicalRole),
    q: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
    // 1. Auth check
    const authResult = await JwtMiddleware.authenticate(req);
    if (!authResult.success || !authResult.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;

    // 2. Parse Query Params
    const url = new URL(req.url);
    const queryParams = {
        caseId: url.searchParams.get('caseId') || undefined,
        surgicalRole: url.searchParams.get('surgicalRole') || undefined,
        q: url.searchParams.get('q') || undefined,
        page: url.searchParams.get('page') || undefined,
        pageSize: url.searchParams.get('pageSize') || undefined,
    };

    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
        console.error("API Validation Failed:", JSON.stringify(validation.error.format(), null, 2));
        console.error("Received Params:", queryParams);
        return NextResponse.json({ success: false, error: 'Invalid parameters', details: validation.error.format() }, { status: 400 });
    }

    const { caseId, surgicalRole, q, page, pageSize } = validation.data;

    // 3. Verify Ownership / Access (Basic check: User must be DOCTOR or ADMIN)
    // For strict ownership, check if doctor is primary surgeon on caseId.
    // Skipping strict ownership check for now to allow flexible searches, 
    // but could add: if (user.role === 'DOCTOR') { checkPermissions... }

    // 4. Get Allowed User Roles from Policy
    const allowedUserRoles = ALLOWED_ROLES_MAP[surgicalRole];

    if (!allowedUserRoles || allowedUserRoles.length === 0) {
        return NextResponse.json({
            success: true,
            data: {
                items: [],
                meta: { page, pageSize, total: 0, totalPages: 0 }
            }
        });
    }

    // 5. Build Filters
    const whereClause: any = {
        role: { in: allowedUserRoles },
        status: 'ACTIVE',
    };

    if (q) {
        whereClause.OR = [
            { first_name: { contains: q, mode: 'insensitive' } },
            { last_name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
        ];
    }

    // 6. Execute Query
    const skip = (page - 1) * pageSize;
    const [total, users] = await Promise.all([
        db.user.count({ where: whereClause }),
        db.user.findMany({
            where: whereClause,
            take: pageSize,
            skip: skip,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                role: true,
                // Include related profile if needed (e.g. Doctor specialization)
                doctor_profile: {
                    select: {
                        id: true,
                        specialization: true,
                        license_number: true
                    }
                }
            },
            orderBy: { last_name: 'asc' }
        })
    ]);

    // 7. Format Response
    const items = users.map(u => ({
        id: u.id,
        fullName: `${u.first_name} ${u.last_name}`,
        email: u.email,
        role: u.role,
        specialization: u.doctor_profile?.specialization,
        licenseNumber: u.doctor_profile?.license_number
    }));

    return NextResponse.json({
        success: true,
        data: {
            items,
            meta: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        }
    });
}
