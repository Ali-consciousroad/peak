import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/freelancer/mark-payments-seen - Mark payments as seen by the freelancer
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user
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

    // Only freelancers can mark payments as seen
    const userRole = role?.name || 'client';
    if (userRole !== 'freelance') {
      return NextResponse.json({ error: 'Only freelancers can mark payments as seen' }, { status: 403 });
    }

    const { paymentIds } = await request.json();

    let updateResult;
    // If specific payment IDs provided, mark only those
    // Otherwise, mark all unseen payments for this freelancer's contracts
    if (paymentIds && Array.isArray(paymentIds) && paymentIds.length > 0) {
      console.log(`[Mark Payments Seen] Marking ${paymentIds.length} payments as seen for freelancer ${user.id}`);
      
      // First, get the mission IDs for payments that belong to this freelancer's contracts
      const payments = await prisma.payments.findMany({
        where: {
          id: { in: paymentIds },
          status: 'MADE',
          seenByFreelancerAt: null
        },
        select: { missionId: true }
      });
      
      const missionIds = payments.map(p => p.missionId);
      
      // Get contracts for these missions that belong to this freelancer
      const contracts = await prisma.contracts.findMany({
        where: {
          missionId: { in: missionIds },
          freelancerId: user.id
        },
        select: { missionId: true }
      });
      
      const validMissionIds = contracts.map(c => c.missionId);
      
      // Update only payments for valid missions
      updateResult = await prisma.payments.updateMany({
        where: {
          id: { in: paymentIds },
          status: 'MADE',
          seenByFreelancerAt: null,
          missionId: { in: validMissionIds }
        },
        data: {
          seenByFreelancerAt: new Date()
        }
      });
      console.log(`[Mark Payments Seen] Updated ${updateResult.count} payments`);
    } else {
      console.log(`[Mark Payments Seen] Marking all unseen payments as seen for freelancer ${user.id}`);
      
      // Get all mission IDs for this freelancer's contracts
      const contracts = await prisma.contracts.findMany({
        where: {
          freelancerId: user.id
        },
        select: { missionId: true }
      });
      
      const missionIds = contracts.map(c => c.missionId);
      
      // Update all unseen payments for these missions
      updateResult = await prisma.payments.updateMany({
        where: {
          status: 'MADE',
          seenByFreelancerAt: null,
          missionId: { in: missionIds }
        },
        data: {
          seenByFreelancerAt: new Date()
        }
      });
      console.log(`[Mark Payments Seen] Updated ${updateResult.count} payments`);
    }

    return NextResponse.json({ success: true, count: updateResult.count });
  } catch (error) {
    console.error('Error marking payments as seen:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

