/**
 * Inventory Audit Endpoint
 * 
 * GET /api/admin/inventory/audit
 * 
 * Returns paginated inventory audit events with filters.
 * ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeRoles } from '@/lib/auth/inventoryAuthorization';
import { Role } from '@/domain/enums/Role';
import { InventoryAuditEntityType } from '@/application/services/InventoryAuditService';
import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const AuditQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  actorUserId: z.string().optional(),
  entityType: z.nativeEnum(InventoryAuditEntityType).optional(),
  entityId: z.string().optional(),
  eventType: z.string().optional(),
  page: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
  limit: z.string().transform((val) => parseInt(val, 10)).optional().default('50'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/admin/inventory/audit');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeRoles(authResult, [Role.ADMIN]);
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Only ADMIN can view audit events'));
    }

    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    let parsed;
    try {
      parsed = AuditQuerySchema.parse(queryParams);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error, 'Invalid audit query parameters');
      }
      throw error;
    }

    // Build where clause
    const where: any = {};

    if (parsed.from || parsed.to) {
      where.created_at = {};
      if (parsed.from) {
        where.created_at.gte = new Date(parsed.from);
      }
      if (parsed.to) {
        where.created_at.lte = new Date(parsed.to);
      }
    }

    if (parsed.actorUserId) {
      where.actor_user_id = parsed.actorUserId;
    }

    if (parsed.entityType) {
      where.entity_type = parsed.entityType;
    }

    if (parsed.entityId) {
      where.entity_id = parsed.entityId;
    }

    if (parsed.eventType) {
      where.event_type = parsed.eventType;
    }

    // Pagination
    const page = Math.max(1, parsed.page);
    const limit = Math.min(100, Math.max(1, parsed.limit));
    const skip = (page - 1) * limit;

    // Fetch events with pagination
    const [events, total] = await Promise.all([
      db.inventoryAuditEvent.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              role: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      db.inventoryAuditEvent.count({ where }),
    ]);

    const responseData = {
      events: events.map((event) => ({
        id: event.id,
        eventType: event.event_type,
        actor: {
          userId: event.actor_user_id,
          email: event.actor.email,
          name: `${event.actor.first_name || ''} ${event.actor.last_name || ''}`.trim() || event.actor.email,
          role: event.actor.role,
        },
        entityType: event.entity_type,
        entityId: event.entity_id,
        externalRef: event.external_ref,
        metadata: event.metadata_json ? JSON.parse(event.metadata_json) : null,
        createdAt: event.created_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        from: parsed.from || null,
        to: parsed.to || null,
        actorUserId: parsed.actorUserId || null,
        entityType: parsed.entityType || null,
        entityId: parsed.entityId || null,
        eventType: parsed.eventType || null,
      },
    };

    timer.end({ userId: authzResult.user.userId, total });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
