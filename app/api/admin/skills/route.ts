import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/admin/skills - Get all skills (admin only)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const userRole = role?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all skills with their categories and user count
    const skills = await prisma.skills.findMany({
      include: {
        categories: {
          select: {
            categoryId: true,
            name: true
          }
        },
        users: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Format response with user count
    const formattedSkills = skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
      categories: skill.categories,
      userCount: skill.users.length
    }));

    return NextResponse.json(formattedSkills);
  } catch (error) {
    console.error('Error fetching all skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

// POST /api/admin/skills - Create a new skill (admin only)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const userRole = role?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, categoryId } = body;

    // Validate required fields
    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Skill name and category are required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await prisma.categories.findUnique({
      where: { categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Check if skill already exists
    const existingSkill = await prisma.skills.findUnique({
      where: { name }
    });

    if (existingSkill) {
      return NextResponse.json(
        { error: 'Skill with this name already exists' },
        { status: 409 }
      );
    }

    // Create the new skill
    const skill = await prisma.skills.create({
      data: {
        id: randomUUID(),
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: user.id,
        categories: {
          connect: { categoryId }
        }
      },
      include: {
        categories: {
          select: {
            categoryId: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(skill, { status: 201 });
  } catch (error: any) {
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create skill',
        details: error?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

