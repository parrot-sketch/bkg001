import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const isActive = searchParams.get('is_active');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    if (isActive !== null) {
      where.is_active = isActive === 'true';
    }
    if (search) {
      where.OR = [
        { service_name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [services, total] = await Promise.all([
      db.service.findMany({
        where,
        orderBy: { service_name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.service.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: services,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { service_name, description, price, category, is_active, price_type, min_price, max_price } = body;

    if (!service_name || price === undefined) {
      return NextResponse.json({ success: false, error: 'Name and price required' }, { status: 400 });
    }

    const service = await db.service.create({
      data: {
        service_name,
        description: description || null,
        price,
        category: category || null,
        is_active: is_active ?? true,
        price_type: price_type || 'FIXED',
        min_price: min_price || null,
        max_price: max_price || null,
      },
    });

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json({ success: false, error: 'Failed to create service' }, { status: 500 });
  }
}