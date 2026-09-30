import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/client/mark-contracts-seen - Mark contracts as seen by the client
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

    // Only clients can mark contracts as seen
    const userRole = role?.name || 'client';
    if (userRole !== 'client') {
      return NextResponse.json({ error: 'Only clients can mark contracts as seen' }, { status: 403 });
    }

    const { contractIds } = await request.json();

    let updateResult;
    // If specific contract IDs provided, mark only those
    // Otherwise, mark all unseen contracts for this client
    if (contractIds && Array.isArray(contractIds) && contractIds.length > 0) {
      console.log(`[Mark Contracts Seen] Marking ${contractIds.length} contracts as seen for client ${user.id}`);
      updateResult = await prisma.contracts.updateMany({
        where: {
          id: { in: contractIds },
          missions: {
            clientId: user.id
          },
          seenByClientAt: null
        },
        data: {
          seenByClientAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`[Mark Contracts Seen] Updated ${updateResult.count} contracts`);
    } else {
      console.log(`[Mark Contracts Seen] Marking all unseen contracts as seen for client ${user.id}`);
      updateResult = await prisma.contracts.updateMany({
        where: {
          missions: {
            clientId: user.id
          },
          seenByClientAt: null
        },
        data: {
          seenByClientAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log(`[Mark Contracts Seen] Updated ${updateResult.count} contracts`);
    }

    return NextResponse.json({ success: true, count: updateResult.count });
  } catch (error) {
    console.error('Error marking contracts as seen:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

