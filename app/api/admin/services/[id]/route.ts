import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const serviceId = parseInt(id, 10);

    if (isNaN(serviceId)) {
      return NextResponse.json({ success: false, error: 'Invalid service ID' }, { status: 400 });
    }

    const service = await db.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch service' }, { status: 500 });
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
    const serviceId = parseInt(id, 10);

    if (isNaN(serviceId)) {
      return NextResponse.json({ success: false, error: 'Invalid service ID' }, { status: 400 });
    }

    const existing = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    const body = await request.json();
    const { service_name, description, price, category, is_active, price_type, min_price, max_price } = body;

    const service = await db.service.update({
      where: { id: serviceId },
      data: {
        ...(service_name && { service_name }),
        ...(description !== undefined && { description: description || null }),
        ...(price !== undefined && { price }),
        ...(category !== undefined && { category: category || null }),
        ...(is_active !== undefined && { is_active }),
        ...(price_type && { price_type }),
        ...(min_price !== undefined && { min_price: min_price || null }),
        ...(max_price !== undefined && { max_price: max_price || null }),
      },
    });

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ success: false, error: 'Failed to update service' }, { status: 500 });
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
    const serviceId = parseInt(id, 10);

    if (isNaN(serviceId)) {
      return NextResponse.json({ success: false, error: 'Invalid service ID' }, { status: 400 });
    }

    const existing = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
    }

    await db.service.update({
      where: { id: serviceId },
      data: { is_active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete service' }, { status: 500 });
  }
}