import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');

    const where: any = {};
    if (isActive !== null) {
      where.is_active = isActive === 'true';
    }

    const categories = await db.procedureCategoryConfig.findMany({
      where,
      orderBy: { display_order: 'asc' },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
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
    const { name, code, description, displayOrder, isActive, colorCode } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      );
    }

    const existing = await db.procedureCategoryConfig.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Category with this code already exists' },
        { status: 400 }
      );
    }

    const category = await db.procedureCategoryConfig.create({
      data: {
        name,
        code,
        description: description || null,
        display_order: displayOrder || 0,
        is_active: isActive ?? true,
        color_code: colorCode || null,
      },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}