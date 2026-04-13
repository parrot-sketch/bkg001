import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    if (subcategory) {
      where.subcategory = subcategory;
    }
    if (isActive !== null) {
      where.is_active = isActive === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [procedures, total] = await Promise.all([
      db.surgicalProcedureOption.findMany({
        where,
        include: {
          procedure_service_links: {
            include: {
              service: {
                select: {
                  id: true,
                  service_name: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.surgicalProcedureOption.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: procedures,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching procedures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch procedures' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      category,
      subcategory,
      description,
      isActive,
      isBillable,
      estimatedDurationMinutes,
      defaultPrice,
      minPrice,
      maxPrice,
      preparationNotes,
      postOpNotes,
      serviceIds,
    } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: 'Name and category are required' },
        { status: 400 }
      );
    }

    const procedure = await db.surgicalProcedureOption.create({
      data: {
        name,
        category,
        subcategory: subcategory || null,
        description: description || null,
        is_active: isActive ?? true,
        is_billable: isBillable ?? true,
        estimated_duration_minutes: estimatedDurationMinutes || null,
        default_price: defaultPrice || null,
        min_price: minPrice || null,
        max_price: maxPrice || null,
        preparation_notes: preparationNotes || null,
        post_op_notes: postOpNotes || null,
        created_by: authResult.user.userId,
      },
    });

    if (serviceIds && serviceIds.length > 0) {
      await db.procedureServiceLink.createMany({
        data: serviceIds.map((serviceId: number, index: number) => ({
          procedure_id: procedure.id,
          service_id: serviceId,
          is_primary: index === 0,
        })),
      });
    }

    return NextResponse.json({ success: true, data: procedure });
  } catch (error) {
    console.error('Error creating procedure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create procedure' },
      { status: 500 }
    );
  }
}