import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/freelancer/mark-offers-seen - Mark received offers as seen by the freelancer
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = user.roleId
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    const userRole = role?.name || 'client';
    if (userRole !== 'freelance') {
      return NextResponse.json(
        { error: 'Only freelancers can mark offers as seen' },
        { status: 403 }
      );
    }

    // Mark all unseen pending offers for this freelancer
    const updateResult = await prisma.offers.updateMany({
      where: {
        freelancerId: user.id,
        status: 'PENDING',
        seenByFreelancerAt: null
      },
      data: {
        seenByFreelancerAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, count: updateResult.count });
  } catch (error) {
    console.error('Error marking offers as seen:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
