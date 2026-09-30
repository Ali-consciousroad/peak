export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/missions/my-missions - Get all missions for the current client (for dashboard)
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user info
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId },
      select: { id: true, roleId: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    let userRole = 'client';
    if (currentUser.roleId) {
      const role = await prisma.roles.findUnique({
        where: { id: currentUser.roleId }
      });
      userRole = role?.name || 'client';
    }

    // Only clients can access this endpoint
    if (userRole !== 'client') {
      return NextResponse.json({ error: 'Forbidden: Only clients can access their missions' }, { status: 403 });
    }

    // Get ALL missions for this client (regardless of status)
    const missions = await prisma.missions.findMany({
      where: {
        clientId: currentUser.id
      },
      include: {
        users_missions_clientIdTousers: true,
        categories: true,
        contracts: true // Include contract info to see if mission has active contract
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fix inconsistent data: missions with active contracts should not appear as OPEN
    const missionsToFix = missions
      .filter(mission => mission.status === 'OPEN' && mission.contracts?.isActive === true)
      .map(mission => mission.id);
    if (missionsToFix.length > 0) {
      await prisma.missions.updateMany({
        where: { id: { in: missionsToFix }, status: 'OPEN' },
        data: { status: 'IN_PROGRESS', updatedAt: new Date() }
      });
    }

    // Map to expected frontend format
    const mappedMissions = missions.map(mission => ({
      ...mission,
      client: mission.users_missions_clientIdTousers,
      contract: mission.contracts,
      // Normalize status for missions with active contracts
      status: mission.status === 'OPEN' && mission.contracts?.isActive === true ? 'IN_PROGRESS' : mission.status,
      users_missions_clientIdTousers: undefined
    }));

    return NextResponse.json(mappedMissions);
  } catch (error: any) {
    console.error("Error fetching client missions:", error);
    return NextResponse.json(
      { error: "Failed to fetch missions", message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}