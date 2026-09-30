import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remainingEscrow, releasedFromEscrow } from '@/lib/remaining-escrow';

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

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    const userRole = role?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get missions that are past grace period and need admin review
    const missions = await prisma.missions.findMany({
      where: {
        status: 'OVERDUE',
        gracePeriodEnd: { lte: new Date() },
      },
      include: {
        users_missions_clientIdTousers: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        payments: {
          include: {
            currencies: true
          }
        }
      },
      orderBy: {
        gracePeriodEnd: 'asc'
      }
    });

    const missionsWithRefundInfo = missions.map(mission => {
      const totalPaid = releasedFromEscrow(mission.payments);
      const totalAmount = Number(mission.dailyRate) * mission.timeframe;
      const potentialRefundAmount = remainingEscrow(mission.payments);

      return {
        id: mission.id,
        title: mission.title,
        deadline: mission.deadline,
        gracePeriodEnd: mission.gracePeriodEnd,
        potentialRefundAmount: potentialRefundAmount > 0 ? potentialRefundAmount : 0,
        totalPaid,
        totalAmount,
        dailyRate: mission.dailyRate,
        timeframe: mission.timeframe,
        client: mission.users_missions_clientIdTousers,
        freelancer: mission.contracts?.users_contracts_freelancerIdTousers,
        currency: {
          code: mission.payments[0]?.currencies?.code || 'EUR',
          symbol: '€'
        }
      };
    });

    return NextResponse.json(missionsWithRefundInfo);
  } catch (error) {
    console.error('Error fetching overdue missions:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

