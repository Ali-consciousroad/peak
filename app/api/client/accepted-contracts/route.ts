import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/client/accepted-contracts - Get recently accepted contracts for the client
export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Only clients can see accepted contracts
    const userRole = role?.name || 'client';
    if (userRole !== 'client') {
      return NextResponse.json({ error: 'Only clients can view accepted contracts' }, { status: 403 });
    }

    // Find UNSEEN contracts for missions created by this client, created in the last 7 days
    // Only show contracts that haven't been viewed yet - notification disappears after viewing
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
    
    console.log(`[Accepted Contracts API] Seven days ago:`, sevenDaysAgo.toISOString());

    // Debug: Check all contracts for this client first
    const allContracts = await prisma.contracts.findMany({
      where: {
        missions: {
          clientId: user.id
        }
      },
      select: {
        id: true,
        createdAt: true,
        seenByClientAt: true,
        isActive: true,
        missions: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    console.log(`[Accepted Contracts API] All contracts for client ${user.id}:`, allContracts.length);
    console.log(`[Accepted Contracts API] Contract details:`, allContracts.map(c => ({
      id: c.id,
      createdAt: c.createdAt,
      seenByClientAt: c.seenByClientAt,
      isActive: c.isActive,
      missionTitle: c.missions?.title,
      isRecent: c.createdAt >= sevenDaysAgo
    })));

    const contracts = await prisma.contracts.findMany({
      where: {
        missions: {
          clientId: user.id
        },
        createdAt: {
          gte: sevenDaysAgo
        },
        isActive: true,
        seenByClientAt: null // Only show contracts that haven't been seen yet
      },
      select: {
        id: true,
        createdAt: true,
        seenByClientAt: true, // Include this so frontend knows which are new
        missions: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        users_contracts_freelancerIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Limit to 10 most recent
    });

    // Debug logging
    console.log(`[Accepted Contracts API] Found ${contracts.length} unseen contracts for client ${user.id}`);
    if (contracts.length > 0) {
      console.log(`[Accepted Contracts API] Contract IDs:`, contracts.map(c => c.id));
    }

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Error fetching accepted contracts:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

