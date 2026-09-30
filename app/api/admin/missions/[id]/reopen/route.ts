import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/admin/missions/[id]/reopen - Reopen a refunded mission for new offers
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

    const role = user.roleId
      ? await prisma.roles.findUnique({ where: { id: user.roleId } })
      : null;
    const userRole = role?.name || 'client';

    const mission = await prisma.missions.findUnique({
      where: { id: params.id },
      include: { contracts: true }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (mission.status !== 'REFUNDED') {
      return NextResponse.json(
        { error: 'Only refunded missions can be reopened' },
        { status: 400 }
      );
    }

    // Admin or mission owner (client) can reopen
    const isAdmin = userRole === 'admin';
    const isOwner = mission.clientId === user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (mission.contracts) {
      await prisma.contracts.update({
        where: { id: mission.contracts.id },
        data: { isActive: false, updatedAt: new Date() }
      });
    }

    await prisma.missions.update({
      where: { id: mission.id },
      data: { status: 'OPEN', updatedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'Mission reopened and available for new offers',
      missionId: mission.id
    });
  } catch (error: any) {
    console.error('Error reopening mission:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message },
      { status: 500 }
    );
  }
}
