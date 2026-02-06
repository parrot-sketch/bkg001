import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import db from '@/lib/db';

/**
 * POST /api/notifications/read-all
 * 
 * Marks all notifications as read for the current user.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;

    // Update all unread notifications for this user
    const result = await db.notification.updateMany({
      where: {
        user_id: userId,
        status: { not: 'READ' },
      },
      data: {
        status: 'READ',
        read_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { count: result.count },
      message: `Marked ${result.count} notifications as read`,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
