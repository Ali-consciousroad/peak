import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/freelancer/received-offers - Get unseen received offers (same pattern as /api/client/accepted-contracts)
export const dynamic = 'force-dynamic';

export async function GET() {
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
      ? await prisma.roles.findUnique({ where: { id: user.roleId } })
      : null;

    const userRole = role?.name || 'client';
    if (userRole !== 'freelance') {
      return NextResponse.json({ error: 'Only freelancers can view received offers' }, { status: 403 });
    }

    // Only show UNSEEN pending offers for this builder (notification disappears after visiting /offers)
    const offers = await prisma.offers.findMany({
      where: {
        freelancerId: user.id,
        status: 'PENDING',
        seenByFreelancerAt: null
      },
      include: {
        missions: {
          include: {
            users_missions_clientIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const transformedOffers = offers.map(o => ({
      ...o,
      mission: o.missions ? {
        ...o.missions,
        client: o.missions.users_missions_clientIdTousers
      } : null
    }));

    return NextResponse.json(transformedOffers);
  } catch (error) {
    console.error('Error fetching received offers:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
