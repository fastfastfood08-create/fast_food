import { NextResponse } from 'next/server';

import prisma from '@/app/lib/prisma'; // Import shared instance

export const dynamic = 'force-dynamic'; // Ensure this route is not cached

export async function GET(request) {
  try {
    // Optional: Add simple authorization to prevent accidental triggering
    // You can use a query parameter or checking the Authorization header
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    // Check for a secret key if configured (recommended for production)
    const CRON_SECRET = process.env.CRON_SECRET || 'daily_cleanup_key';
    
    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete only 'delivered' and 'cancelled' orders
    // This will cascade delete order items automatically defined in schema
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        status: {
          in: ['delivered', 'cancelled']
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedCount: deletedOrders.count,
      targetStatuses: ['delivered', 'cancelled'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to perform cleanup', details: error.message },
      { status: 500 }
    );
  }
}
