import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/payments/[id]/cancel - Cancel payment and refund client
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

    // Find the payment
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
        },
        currencies: true,
        users: true
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check permissions
    const isPaymentOwner = payment.userId === user.id;
    const isAdmin = userRole === 'admin';

    if (!isPaymentOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only cancel your own payments' },
        { status: 403 }
      );
    }

    // Check if payment is in correct status
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Payment cannot be cancelled. Current status: ${payment.status}` },
        { status: 400 }
      );
    }

    // Update payment status to cancelled
    const updatedPayment = await prisma.payments.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      },
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
        },
        currencies: true,
        users: true
      }
    });

    // Check if mission still has an active contract
    const mission = await prisma.missions.findUnique({
      where: { id: payment.missionId },
      include: {
        contracts: true
      }
    });

    // Only set mission status back to OPEN if there's no contract
    // If contract exists, mission should remain IN_PROGRESS
    if (mission && !mission.contracts) {
      await prisma.missions.update({
        where: { id: payment.missionId },
        data: { 
          status: 'OPEN',
          updatedAt: new Date()
        }
      });
    }
    // If contract exists, mission status should remain IN_PROGRESS
    // Contract termination should only happen through conflict resolution

    return NextResponse.json({
      message: 'Payment cancelled successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel payment' },
      { status: 500 }
    );
  }
}
