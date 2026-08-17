import { NextRequest, NextResponse } from 'next/server';

// These categories are the source of truth — they match the SurgicalProcedureOption category enum
// ProcedureCategoryConfig was never migrated to the DB, so we return the static list here.
const PROCEDURE_CATEGORIES = [
  { code: 'FACIAL', name: 'Facial Procedures', display_order: 1, is_active: true, color_code: null, description: null },
  { code: 'BODY', name: 'Body Procedures', display_order: 2, is_active: true, color_code: null, description: null },
  { code: 'BREAST', name: 'Breast Procedures', display_order: 3, is_active: true, color_code: null, description: null },
  { code: 'SKIN_AND_SCAR', name: 'Skin and Scar Treatments', display_order: 4, is_active: true, color_code: null, description: null },
  { code: 'NON_SURGICAL', name: 'Non-Surgical Treatments', display_order: 5, is_active: true, color_code: null, description: null },
  { code: 'OTHER', name: 'Other', display_order: 6, is_active: true, color_code: null, description: null },
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