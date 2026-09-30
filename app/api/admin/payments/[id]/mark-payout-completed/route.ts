import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// POST /api/admin/payments/[id]/mark-payout-completed
// Marks an off-chain payout as completed by admin and notifies client + builder.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });
    if (!adminUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = adminUser.roleId
      ? await prisma.roles.findUnique({ where: { id: adminUser.roleId } })
      : null;
    if ((role?.name || 'client') !== 'admin') {
      return NextResponse.json({ error: 'Only admins can mark payout completed' }, { status: 403 });
    }

    const payment = await prisma.payments.findUnique({
      where: { id: params.id },
      include: {
        missions: {
          include: {
            users_missions_clientIdTousers: true,
            contracts: {
              include: {
                users_contracts_freelancerIdTousers: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'RELEASED') {
      return NextResponse.json(
        { error: `Only released milestone payouts can be marked completed. Current status: ${payment.status}` },
        { status: 400 }
      );
    }

    const clientId = payment.missions?.users_missions_clientIdTousers?.id;
    const freelancerId = payment.missions?.contracts?.users_contracts_freelancerIdTousers?.id;
    if (!clientId || !freelancerId) {
      return NextResponse.json(
        { error: 'Mission client/freelancer context missing for notifications' },
        { status: 400 }
      );
    }

    const missionTitle = payment.missions?.title || 'Unknown mission';
    const amountText = Number(payment.amount).toFixed(2);
    const notificationPayload = [
      {
        id: randomUUID(),
        userId: clientId,
        type: 'payout_completed',
        missionId: payment.missionId || null,
        title: 'Milestone payout completed',
        message: `Admin confirmed the builder payout of €${amountText} for mission "${missionTitle}".`,
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        userId: freelancerId,
        type: 'payout_completed',
        missionId: payment.missionId || null,
        title: 'Milestone payout completed',
        message: `Your payout of €${amountText} for mission "${missionTitle}" has been completed by admin.`,
        updatedAt: new Date()
      }
    ];

    await prisma.notifications.createMany({ data: notificationPayload });

    return NextResponse.json({
      success: true,
      message: 'Payout marked completed and users notified'
    });
  } catch (error) {
    console.error('Error marking payout completed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

