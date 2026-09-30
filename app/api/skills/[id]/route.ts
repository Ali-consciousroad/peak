import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// GET /api/skills/[id] - Get a specific skill (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const skill = await prisma.skills.findUnique({
      where: { id: params.id },
      include: {
        categories: true,
        users: true
      },
    });

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Error fetching skill:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}

// PUT /api/skills/[id] - Update a skill (User with skill or Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    // Check if skill exists
    const existingSkill = await prisma.skills.findUnique({
      where: { id: params.id },
      include: { 
        users: true,
        categories: true
      },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Check permissions (user has this skill or admin)
    const userHasSkill = existingSkill.users.some(skillUser => skillUser.id === user.id);
    const userRole = role?.name || 'client';
    const isAdmin = userRole === 'admin';

    if (!userHasSkill && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, categoryId } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;

    // If categoryId is provided, update the categories relationship
    if (categoryId) {
      // First disconnect all existing categories
      await prisma.skills.update({
        where: { id: params.id },
        data: {
          categories: {
            set: []
          }
        }
      });
      
      // Then connect the new category
      updateData.categories = {
        connect: { categoryId }
      };
    }

    const skill = await prisma.skills.update({
      where: { id: params.id },
      data: updateData,
      include: {
        categories: true,
        users: true
      },
    });

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}

// DELETE /api/skills/[id] - Delete a skill (User with skill or Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    // Check if skill exists
    const existingSkill = await prisma.skills.findUnique({
      where: { id: params.id },
      include: { 
        users: true,
        categories: true
      },
    });

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Check permissions (user has this skill or admin)
    const userHasSkill = existingSkill.users.some(skillUser => skillUser.id === user.id);
    const userRole = role?.name || 'client';
    const isAdmin = userRole === 'admin';

    if (!userHasSkill && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await prisma.skills.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: 'Skill deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}