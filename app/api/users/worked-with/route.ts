import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

// GET /api/users/worked-with - Get users that the current user has worked with on missions
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find all missions where the current user is involved
    const missions = await prisma.missions.findMany({
      where: {
        OR: [
          { clientId: currentUser.id }, // User is the client
          {
            contracts: {
              OR: [
                { freelancerId: currentUser.id }, // User is the freelancer
                { adminId: currentUser.id }, // User is the admin
              ],
            },
          },
        ],
      },
      include: {
        users_missions_clientIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            users_contracts_adminIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Extract unique users that the current user has worked with
    const workedWithUsers = new Map();

    missions.forEach(mission => {
      // Add the client
      if (mission.users_missions_clientIdTousers?.id !== currentUser.id) {
        workedWithUsers.set(mission.users_missions_clientIdTousers.id, mission.users_missions_clientIdTousers);
      }

      // Add the freelancer if contract exists
      if (mission.contracts?.users_contracts_freelancerIdTousers && mission.contracts.users_contracts_freelancerIdTousers.id !== currentUser.id) {
        workedWithUsers.set(mission.contracts.users_contracts_freelancerIdTousers.id, mission.contracts.users_contracts_freelancerIdTousers);
      }

      // Add the admin if contract exists
      if (mission.contracts?.users_contracts_adminIdTousers && mission.contracts.users_contracts_adminIdTousers.id !== currentUser.id) {
        workedWithUsers.set(mission.contracts.users_contracts_adminIdTousers.id, mission.contracts.users_contracts_adminIdTousers);
      }
    });

    // Convert map to array
    const users = Array.from(workedWithUsers.values());

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching worked-with users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
