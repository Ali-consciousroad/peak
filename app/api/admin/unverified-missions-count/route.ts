export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// GET /api/admin/unverified-missions-count - Get count of unverified missions (admin only)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const role = currentUser.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    // Check if user is admin
    const userRole = role?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Count unverified missions (isVerified is false)
    const unverifiedCount = await prisma.missions.count({
      where: {
        isVerified: false
      }
    });

    return NextResponse.json({ count: unverifiedCount });
  } catch (error) {
    console.error('Error fetching unverified missions count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unverified missions count' },
      { status: 500 }
    );
  }
}

