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

    // Delete all orders
    // This will cascade delete order items
    // Customer info and ratings are embedded in orders, so they are deleted too.
    const deletedOrders = await prisma.order.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedCount: deletedOrders.count,
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
