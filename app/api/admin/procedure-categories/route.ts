import { NextRequest, NextResponse } from 'next/server';

// These categories are the source of truth — they match the SurgicalProcedureOption category enum
// ProcedureCategoryConfig was never migrated to the DB, so we return the static list here.
const PROCEDURE_CATEGORIES = [
  { code: 'FACE', name: 'Face', display_order: 1, is_active: true, color_code: null, description: null },
  { code: 'FACE_AND_NECK', name: 'Face & Neck', display_order: 2, is_active: true, color_code: null, description: null },
  { code: 'BREAST', name: 'Breast', display_order: 3, is_active: true, color_code: null, description: null },
  { code: 'BODY', name: 'Body', display_order: 4, is_active: true, color_code: null, description: null },
  { code: 'BODY_CONTOURING', name: 'Body Contouring', display_order: 5, is_active: true, color_code: null, description: null },
  { code: 'RECONSTRUCTIVE', name: 'Reconstructive', display_order: 6, is_active: true, color_code: null, description: null },
  { code: 'INTIMATE_AESTHETIC', name: 'Intimate Aesthetic', display_order: 7, is_active: true, color_code: null, description: null },
  { code: 'HAIR_RESTORATION', name: 'Hair Restoration', display_order: 8, is_active: true, color_code: null, description: null },
  { code: 'NON_SURGICAL', name: 'Non Surgical', display_order: 9, is_active: true, color_code: null, description: null },
  { code: 'POST_WEIGHT_LOSS', name: 'Post Weight Loss', display_order: 10, is_active: true, color_code: null, description: null },
  { code: 'OTHER', name: 'Other', display_order: 11, is_active: true, color_code: null, description: null },
];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('is_active');

    let categories = PROCEDURE_CATEGORIES;
    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      categories = categories.filter((c) => c.is_active === activeFilter);
    }

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest): Promise<NextResponse> {
  // Categories are enum-driven and cannot be created dynamically without a schema migration.
  return NextResponse.json(
    { success: false, error: 'Categories are system-defined and cannot be created via API' },
    { status: 405 }
  );
}