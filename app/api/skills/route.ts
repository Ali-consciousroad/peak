import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { getAllSkills, SKILL_CATEGORIES } from '@/lib/skills';

// GET /api/skills - Get all skills (public) or predefined skills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const predefined = searchParams.get('predefined');

    // If requesting predefined skills
    if (predefined === 'true') {
      return NextResponse.json({
        categories: SKILL_CATEGORIES,
        skills: getAllSkills()
      });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's skills from database
    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      include: {
        skills: {
          include: {
            categories: true
          },
          orderBy: {
            name: 'asc'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const skills = user.skills;

    return NextResponse.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}

// POST /api/skills - Create a new skill (Freelance only)
export async function POST(request: NextRequest) {
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

    // Check if user has freelance role
    const userRole = role?.name || 'client';
    const isFreelance = userRole === 'freelance';
    if (!isFreelance) {
      return NextResponse.json(
        { error: 'Only freelances can add skills' },
        { status: 403 }
      );
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

    if (!existingSkill) {
      return NextResponse.json(
        { error: 'Skill does not exist. Only admins can create new skills. Please select an existing skill.' },
        { status: 404 }
      );
    }

    // Check if user already has this skill
    const userHasSkill = await prisma.users.findUnique({
      where: { id: user.id },
      include: {
        skills: {
          where: { id: existingSkill.id }
        }
      }
    });

    if (userHasSkill && userHasSkill.skills.length > 0) {
      return NextResponse.json(
        { error: 'You already have this skill' },
        { status: 409 }
      );
    }

    // Skill exists, connect it to the user using raw SQL
    // In _UserSkills: A = skill ID, B = user ID
    try {
      await prisma.$executeRaw`
        INSERT INTO "_UserSkills" ("A", "B")
        VALUES (${existingSkill.id}, ${user.id})
        ON CONFLICT DO NOTHING
      `;

      // Fetch the updated skill with relations
      const skill = await prisma.skills.findUnique({
        where: { id: existingSkill.id },
        include: {
          categories: true
        }
      });

      return NextResponse.json(skill, { status: 200 });
    } catch (error: any) {
      console.error('Error connecting skill:', error);
      if (error.code === 'P2003' || error.code === '23503') {
        return NextResponse.json(
          { error: 'Failed to add skill. Please try again or contact support.' },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating skill:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to add skill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 