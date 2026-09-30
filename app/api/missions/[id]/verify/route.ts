import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// PUT /api/missions/[id]/verify - Verify a mission (admin only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const missionId = params.id;
    const { isVerified } = await request.json();

    // Find the user in our database
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

    // Check if user is admin
    const userRole = role?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can verify missions' }, { status: 403 });
    }

    // Find the mission
    const mission = await prisma.missions.findUnique({
      where: { id: missionId },
      include: { users_missions_clientIdTousers: true }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Update mission verification status
    const updatedMission = await prisma.missions.update({
      where: { id: missionId },
      data: {
        isVerified,
        verifierId: isVerified ? user.id : null,
        updatedAt: new Date()
      },
      include: {
        users_missions_clientIdTousers: true,
        users_missions_verifierIdTousers: true
      }
    });

    return NextResponse.json(updatedMission);
  } catch (error) {
    console.error('Error verifying mission:', error);
    return NextResponse.json(
      { error: 'Failed to verify mission' },
      { status: 500 }
    );
  }
}
