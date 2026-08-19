/**
 * GET /api/theater-tech/patients
 * 
 * Returns patients for theater tech to select for surgical planning.
 * Accessible by THEATER_TECHNICIAN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    if (authResult.user.role !== Role.THEATER_TECHNICIAN && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 12), 100);
    const search = searchParams.get('q')?.trim() || undefined;
    const createdToday = searchParams.get('createdToday') === 'true';
    const createdThisMonth = searchParams.get('createdThisMonth') === 'true';

    const where: any = {};

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' as const } },
        { last_name: { contains: search, mode: 'insensitive' as const } },
        { file_number: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    if (createdToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.created_at = { gte: today };
    }

    if (createdThisMonth) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      where.created_at = { ...where.created_at, gte: monthStart };
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          file_number: true,
          date_of_birth: true,
          gender: true,
          email: true,
          phone: true,
          whatsapp_phone: true,
          marital_status: true,
          occupation: true,
          address: true,
          emergency_contact_name: true,
          emergency_contact_number: true,
          relation: true,
          blood_group: true,
          allergies: true,
          medical_conditions: true,
          insurance_provider: true,
          insurance_number: true,
          referral_source: true,
          img: true,
          colorCode: true,
          approved: true,
          approved_by: true,
          approved_at: true,
          assigned_to_user_id: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { first_name: 'asc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.patient.count({ where }),
    ]);

    const data = patients.map((p) => ({
      id: p.id,
      fileNumber: p.file_number,
      firstName: p.first_name,
      lastName: p.last_name,
      dateOfBirth: p.date_of_birth ? p.date_of_birth.toISOString() : null,
      gender: p.gender,
      email: p.email,
      phone: p.phone,
      profileImage: p.img,
      colorCode: p.colorCode,
      createdAt: p.created_at.toISOString(),
      totalVisits: 0,
      lastVisitAt: null,
      queueStatus: null,
      outstandingBalance: 0,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch patients' }, { status: 500 });
  }
}
