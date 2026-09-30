import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remainingEscrow, releasedFromEscrow } from '@/lib/remaining-escrow';

export const dynamic = 'force-dynamic';

// POST /api/admin/check-deadlines - Check for overdue missions (mark as OVERDUE, no auto-refunds)
export async function POST() {
  try {
    const authResult = await auth();
    const userId = authResult?.userId;
    
    console.log('🔐 Check deadlines auth check:', { userId, hasAuth: !!authResult });
    
    if (!userId) {
      console.error('❌ No userId from auth()');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
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
    if (userRole !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden: Only admins can trigger deadline checks' 
      }, { status: 403 });
    }

    console.log('🕐 Admin triggered deadline check...');

    // Find missions that are overdue (past deadline but not yet marked as overdue)
    const overdueMissions = await prisma.missions.findMany({
      where: {
        status: 'IN_PROGRESS',
        deadline: { lte: new Date() }
      },
      include: {
        payments: true
      }
    });

    console.log(`📋 Found ${overdueMissions.length} overdue missions`);

    const updatedMissions = [];

    for (const mission of overdueMissions) {
      console.log(`⏰ Mission "${mission.title}" is overdue (deadline: ${mission.deadline})`);
      
      // Update mission status to OVERDUE
      const updatedMission = await prisma.missions.update({
        where: { id: mission.id },
        data: {
          status: 'OVERDUE',
          updatedAt: new Date()
        }
      });

      updatedMissions.push({
        id: mission.id,
        title: mission.title,
        deadline: mission.deadline,
        status: 'OVERDUE'
      });

      console.log(`✅ Updated mission "${mission.title}" to OVERDUE status`);
    }

    // Find missions past grace period that need admin review for potential refund
    const expiredMissions = await prisma.missions.findMany({
      where: {
        status: 'OVERDUE',
        gracePeriodEnd: { lte: new Date() },
      },
      include: {
        payments: true
      }
    });

    console.log(`📋 Found ${expiredMissions.length} missions past grace period (require admin review)`);

    // Calculate potential refund amounts for reporting (no actual refunds processed)
    const missionsNeedingReview = expiredMissions.map(mission => {
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
        totalAmount
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Deadline check completed successfully. Overdue missions marked. Refunds require admin review.',
      results: {
        overdueMissions: updatedMissions,
        missionsNeedingReview,
        summary: {
          totalOverdue: updatedMissions.length,
          totalNeedingReview: missionsNeedingReview.length,
          totalPotentialRefund: missionsNeedingReview.reduce((sum, mission) => sum + mission.potentialRefundAmount, 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error checking deadlines:', error);
    return NextResponse.json(
      { error: 'Failed to check deadlines' },
      { status: 500 }
    );
  }
}
