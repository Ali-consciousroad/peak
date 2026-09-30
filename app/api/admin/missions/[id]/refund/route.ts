import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remainingEscrow } from '@/lib/remaining-escrow';

export const dynamic = 'force-dynamic';

// POST /api/admin/missions/[id]/refund - Process manual refund for overdue mission
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      select: { id: true, roleId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    let userRole = 'client';
    if (user.roleId) {
      const role = await prisma.roles.findUnique({
        where: { id: user.roleId }
      });
      userRole = role?.name || 'client';
    }

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { refundAmount, reason } = await request.json();

    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid refund amount is required' },
        { status: 400 }
      );
    }

    // Find the mission
    const mission = await prisma.missions.findUnique({
      where: { id: params.id },
      include: {
        users_missions_clientIdTousers: true,
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: true
          }
        },
        payments: {
          include: {
            currencies: true
          }
        }
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (mission.status !== 'OVERDUE') {
      return NextResponse.json(
        { error: 'Mission must be in OVERDUE status for refund processing' },
        { status: 400 }
      );
    }

    const maxRefundAmount = remainingEscrow(mission.payments);

    if (refundAmount > maxRefundAmount) {
      return NextResponse.json(
        { error: `Refund amount cannot exceed remaining escrow (€${maxRefundAmount.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Create refund payment record
    const refundPayment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        amount: refundAmount,
        paymentMethod: 'MANUAL_REFUND',
        transactionDate: new Date(),
        missionId: mission.id,
        status: 'COMPLETED',
        userId: mission.clientId,
        currencyId: mission.payments[0]?.currencyId || null,
        createdAt: new Date(),
        updatedAt: new Date()
        // Store refund reason in notes or metadata if needed
      }
    });

    // Deactivate the contract so the mission can receive new offers
    if (mission.contracts) {
      await prisma.contracts.update({
        where: { id: mission.contracts.id },
        data: { isActive: false, updatedAt: new Date() }
      });
    }

    // Reopen mission (OPEN) so it's available for new offers again
    await prisma.missions.update({
      where: { id: mission.id },
      data: {
        status: 'OPEN',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Refund of €${refundAmount.toFixed(2)} processed successfully`,
      refund: {
        id: refundPayment.id,
        amount: refundAmount,
        missionId: mission.id,
        missionTitle: mission.title
      }
    });

  } catch (error: any) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}

