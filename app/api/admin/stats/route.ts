import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      include: { roles: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.roles?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get total users count
    const totalUsers = await prisma.users.count();

    // Get users by role
    const usersByRole = await prisma.users.findMany({
      include: { roles: true }
    });

    // Count users by role
    const roleCounts = {
      client: 0,
      freelance: 0,
      admin: 0,
      support: 0
    };

    usersByRole.forEach(user => {
      const roleName = user.roles?.name || 'client';
      if (roleName in roleCounts) {
        roleCounts[roleName as keyof typeof roleCounts]++;
      }
    });

    // Get recent users (last 10)
    const recentUsers = await prisma.users.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { roles: true }
    });

    const formattedRecentUsers = recentUsers.map(user => ({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      role: user.roles?.name || 'client',
      firstName: user.firstName,
      lastName: user.lastName
    }));

    // Get category stats
    const totalCategories = await prisma.categories.count();
    const categoriesWithMissions = await prisma.categories.count({
      where: {
        missions: {
          some: {}
        }
      }
    });

    return NextResponse.json({
      totalUsers,
      usersByRole: roleCounts,
      recentUsers: formattedRecentUsers,
      totalCategories,
      categoriesWithMissions
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}