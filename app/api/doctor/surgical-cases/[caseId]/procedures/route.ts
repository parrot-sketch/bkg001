/**
 * API Route: GET /api/doctor/surgical-cases/[caseId]/procedures
 * Returns procedure options for a given category (with mapping from form category to enum categories)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

// Mapping from Form categories to the enum categories to query
const FORM_CATEGORY_TO_ENUM_CATEGORIES: Record<string, string[]> = {
  FACIAL: ['FACIAL'],
  BODY: ['BODY'],
  BREAST: ['BREAST'],
  SKIN_AND_SCAR: ['SKIN_AND_SCAR'],
  NON_SURGICAL: ['NON_SURGICAL'],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const { caseId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');

  if (!category) {
    return NextResponse.json(
      { success: false, error: 'Category is required' },
      { status: 400 }
    );
  }

  const enumCategories = FORM_CATEGORY_TO_ENUM_CATEGORIES[category] || [category];

  try {
    // Show ALL procedures regardless of active status
    const procedures = await db.surgicalProcedureOption.findMany({
      where: {
        category: { in: enumCategories as any[] },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        estimated_duration_minutes: true,
        default_price: true,
        min_price: true,
        max_price: true,
        preparation_notes: true,
        post_op_notes: true,
        procedure_service_links: {
          select: {
            id: true,
            is_primary: true,
            service: {
              select: {
                id: true,
                service_name: true,
                price: true,
                category: true,
                is_active: true,
              },
            },
          },
          orderBy: { is_primary: 'desc' },
        },
      },
    });

    return NextResponse.json({ success: true, procedures });
  } catch (error: any) {
    console.error('Error fetching procedures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch procedures' },
      { status: 500 }
    );
  }
}
