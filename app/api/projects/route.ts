export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET /api/projects - Get projects for current user's portfolio
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
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

    // Check if user has permission (freelancers only)
    const userRole = role?.name || 'client';
    const isFreelance = userRole === 'freelance';
    if (!isFreelance) {
      return NextResponse.json({ 
        error: 'Forbidden: Only builders can manage projects' 
      }, { status: 403 });
    }

    // Get or create user's portfolio
    let portfolio = await prisma.portfolios.findFirst({
      where: { userId: currentUser.id },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!portfolio) {
      portfolio = await prisma.portfolios.create({
        data: {
          id: randomUUID(),
          users: {
            connect: { id: currentUser.id }
          },
          name: `${currentUser.firstName || currentUser.email}'s Portfolio`,
          updatedAt: new Date(),
        },
        include: {
          projects: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    }

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 500 });
    }

    return NextResponse.json(portfolio.projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project in user's portfolio
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
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

    // Check if user has permission (freelancers only)
    const userRole = role?.name || 'client';
    const isFreelance = userRole === 'freelance';
    if (!isFreelance) {
      return NextResponse.json({ 
        error: 'Forbidden: Only builders can create projects' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, url, picture } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Missing required fields: name is required" },
        { status: 400 }
      );
    }

    // Get or create user's portfolio
    let portfolio = await prisma.portfolios.findFirst({
      where: { userId: currentUser.id }
    });

    if (!portfolio) {
      portfolio = await prisma.portfolios.create({
        data: {
          id: randomUUID(),
          users: {
            connect: { id: currentUser.id }
          },
          name: `${currentUser.firstName || currentUser.email}'s Portfolio`,
          updatedAt: new Date(),
        }
      });
    }

    // Create the project
    const project = await prisma.projects.create({
      data: {
        id: randomUUID(),
        name: String(name),
        description: typeof description === "string" ? description : null,
        url: typeof url === "string" ? url : null,
        picture: Array.isArray(picture) ? picture.filter((item) => typeof item === "string") : [],
        portfolioId: portfolio.id,
        updatedAt: new Date(),
      },
      include: {
        portfolios: {
          include: {
            users: true
          }
        }
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error("Error details:", { errorMessage, errorStack });
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}

