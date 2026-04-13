/**
 * API Route: GET /api/doctor/surgical-cases/[caseId]/procedures
 * Returns procedure options for a given category (with mapping from form category to enum categories)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

// Mapping from Form's 4 categories to the 8 enum categories to query
const FORM_CATEGORY_TO_ENUM_CATEGORIES: Record<string, string[]> = {
  FACE: ['FACE_AND_NECK', 'NON_SURGICAL', 'HAIR_RESTORATION'],
  BREAST: ['BREAST', 'POST_WEIGHT_LOSS'],
  BODY: ['BODY_CONTOURING', 'POST_WEIGHT_LOSS', 'INTIMATE_AESTHETIC'],
  RECONSTRUCTIVE: ['RECONSTRUCTIVE', 'INTIMATE_AESTHETIC'],
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
    const procedures = await db.surgicalProcedureOption.findMany({
      where: {
        category: { in: enumCategories as any[] },
        is_active: true,
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
        preparation_notes: true,
        post_op_notes: true,
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
