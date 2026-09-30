import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/users - List all users (admin only)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user's role
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const role = currentUser.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    // Check if user has admin role
    const userRole = role?.name || 'client';
    const isAdmin = userRole === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Only admins can view all users' 
      }, { status: 403 });
    }

    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        roleId: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch roles for all users
    const roleIds = [...new Set(users.map(u => u.roleId).filter(Boolean))];
    const roles = roleIds.length > 0 
      ? await prisma.roles.findMany({
          where: { id: { in: roleIds as string[] } }
        })
      : [];
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    // Transform users to include role name
    const usersWithRoles = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.roleId ? roleMap.get(user.roleId) || null : null,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    return NextResponse.json(usersWithRoles);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
