import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const adminRole = adminUser.roleId 
      ? await prisma.roles.findUnique({
          where: { id: adminUser.roleId }
        })
      : null;

    const userRole = adminRole?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get URL parameters for pagination and search
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const roleFilter = url.searchParams.get('role') || '';

    const skip = (page - 1) * limit;

    // Build where clause for search and filtering
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }

    // If role filter is provided, fetch the role ID first
    if (roleFilter) {
      const roleRecord = await prisma.roles.findUnique({
        where: { name: roleFilter }
      });
      if (roleRecord) {
        whereClause.roleId = roleRecord.id;
      } else {
        // If role doesn't exist, return empty results
        return NextResponse.json({
          users: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        });
      }
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.users.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.users.count({ where: whereClause })
    ]);

    // Fetch roles for all users
    const roleIds = Array.from(
      new Set(users.map(u => u.roleId).filter((id): id is string => Boolean(id)))
    );
    const roles = roleIds.length > 0 
      ? await prisma.roles.findMany({
          where: { id: { in: roleIds } }
        })
      : [];
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      role: roleMap.get(user.roleId || '') || 'client',
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      address: user.address
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!adminUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const adminRole = adminUser.roleId 
      ? await prisma.roles.findUnique({
          where: { id: adminUser.roleId }
        })
      : null;

    const userRole = adminRole?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { targetUserId, newRole } = await request.json();

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the role record
    const roleRecord = await prisma.roles.findUnique({
      where: { name: newRole }
    });

    if (!roleRecord) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update user role
    const updatedUser = await prisma.users.update({
      where: { id: targetUserId },
      data: { roleId: roleRecord.id }
    });

    const formattedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      clerkId: updatedUser.clerkId,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      role: newRole,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phoneNumber: updatedUser.phoneNumber,
      address: updatedUser.address
    };

    return NextResponse.json({
      success: true,
      user: formattedUser
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}