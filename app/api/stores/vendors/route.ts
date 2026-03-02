/**
 * Vendor Management Routes
 * 
 * POST /api/stores/vendors - Create vendor
 * GET /api/stores/vendors - List vendors
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { parseCreateVendorRequest } from '@/lib/parsers/vendorParsers';
import { getVendorService } from '@/lib/factories/vendorFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const vendorService = getVendorService();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('POST /api/stores/vendors');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'CREATE_VENDORS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const body = await request.json();
    const dto = parseCreateVendorRequest(body);

    const vendor = await vendorService.createVendor(dto);

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitVendorCreated(
      vendor.id,
      authzResult.user.userId,
      authzResult.user.role as any,
      { vendorName: vendor.name }
    ).catch(() => {
      console.warn('[Audit] Failed to emit VENDOR_CREATED event', { vendorId: vendor.id });
    });

    timer.end({ userId: authzResult.user.userId, vendorId: vendor.id });
    return handleApiSuccess(vendor, 201);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : "Unknown error" });
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/stores/vendors');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_VENDORS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    const vendors = await vendorService.getVendors(includeInactive);

    // Client-side filtering for search (can be moved to server-side for large datasets)
    let filteredVendors = vendors;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filteredVendors = vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(searchLower) ||
          v.email?.toLowerCase().includes(searchLower) ||
          v.contact_person?.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const totalCount = filteredVendors.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedVendors = filteredVendors.slice(startIndex, endIndex);

    timer.end({ userId: authzResult.user.userId, count: paginatedVendors.length, total: totalCount });
    return handleApiSuccess(
      {
        data: paginatedVendors,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
        },
      },
      200
    );
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : "Unknown error" });
    return handleApiError(error);
  }
}
