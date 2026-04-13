import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const procedure = await db.surgicalProcedureOption.findUnique({
      where: { id },
      include: {
        procedure_service_links: {
          include: {
            service: {
              select: {
                id: true,
                service_name: true,
                price: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!procedure) {
      return NextResponse.json(
        { success: false, error: 'Procedure not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: procedure });
  } catch (error) {
    console.error('Error fetching procedure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch procedure' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
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

    const existing = await db.surgicalProcedureOption.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Procedure not found' },
        { status: 404 }
      );
    }

    const procedure = await db.surgicalProcedureOption.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(subcategory !== undefined && { subcategory: subcategory || null }),
        ...(description !== undefined && { description: description || null }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(isBillable !== undefined && { is_billable: isBillable }),
        ...(estimatedDurationMinutes !== undefined && { estimated_duration_minutes: estimatedDurationMinutes || null }),
        ...(defaultPrice !== undefined && { default_price: defaultPrice || null }),
        ...(minPrice !== undefined && { min_price: minPrice || null }),
        ...(maxPrice !== undefined && { max_price: maxPrice || null }),
        ...(preparationNotes !== undefined && { preparation_notes: preparationNotes || null }),
        ...(postOpNotes !== undefined && { post_op_notes: postOpNotes || null }),
      },
    });

    if (serviceIds !== undefined) {
      await db.procedureServiceLink.deleteMany({
        where: { procedure_id: id },
      });

      if (serviceIds.length > 0) {
        await db.procedureServiceLink.createMany({
          data: serviceIds.map((serviceId: number, index: number) => ({
            procedure_id: id,
            service_id: serviceId,
            is_primary: index === 0,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, data: procedure });
  } catch (error) {
    console.error('Error updating procedure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update procedure' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.surgicalProcedureOption.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Procedure not found' },
        { status: 404 }
      );
    }

    await db.surgicalProcedureOption.update({
      where: { id },
      data: { is_active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting procedure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete procedure' },
      { status: 500 }
    );
  }
}