import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ProcedureCategory } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as ProcedureCategory | null;
    const search = searchParams.get('search') || '';
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subcategory: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (!includeInactive) {
      where.is_active = true;
    }

    const options = await db.surgicalProcedureOption.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        category: true,
        subcategory: true,
        name: true,
        description: true,
        is_active: true,
        estimated_duration_minutes: true,
        default_price: true,
      },
    });

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error('[API] Error fetching procedure options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch procedure options' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (authResult.user.role !== Role.ADMIN && authResult.user.role !== Role.FRONTDESK && authResult.user.role !== Role.THEATER_TECHNICIAN && authResult.user.role !== Role.NURSE) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only admin, frontdesk, nurse, or theater-tech can create procedure options' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, category, subcategory, description, estimated_duration_minutes, default_price } = body;

    if (!name || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name and category are required' },
        { status: 400 }
      );
    }

    const validCategories = Object.values(ProcedureCategory);
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    const existing = await db.surgicalProcedureOption.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        category,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A procedure option with this name already exists in this category' },
        { status: 409 }
      );
    }

    const option = await db.surgicalProcedureOption.create({
      data: {
        name,
        category,
        subcategory: subcategory || null,
        description: description || null,
        is_active: true,
        estimated_duration_minutes: estimated_duration_minutes ? parseInt(estimated_duration_minutes) : null,
        default_price: default_price ? parseFloat(default_price) : null,
      },
      select: {
        id: true,
        category: true,
        subcategory: true,
        name: true,
        description: true,
        is_active: true,
        estimated_duration_minutes: true,
        default_price: true,
        created_at: true,
      },
    });

    return NextResponse.json({ success: true, data: option }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating procedure option:', error);
    return NextResponse.json({ success: false, error: 'Failed to create procedure option' }, { status: 500 });
  }
}
