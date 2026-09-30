export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET /api/portfolios - List all portfolios (public)
export async function GET() {
  try {
    const portfolios = await prisma.portfolios.findMany({
      include: {
        users: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json(portfolios);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
      { status: 500 }
    );
  }
}

// POST /api/portfolios - Create a new portfolio (requires FREELANCE role)
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

    // Check if user has permission to manage portfolios
    const userRole = role?.name || 'client';
    const isFreelance = userRole === 'freelance';
    if (!isFreelance) {
      return NextResponse.json({ 
        error: 'Forbidden: Only freelances can create portfolios' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { url, projectName, description, picture } = body;

    // Validate required fields
    if (!projectName) {
      return NextResponse.json(
        { error: "Missing required fields: projectName is required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const projectNameSafe = String(projectName);
    const descriptionSafe = typeof description === "string" ? description : null;
    const urlSafe = typeof url === "string" ? url : null;
    const pictureSafe = Array.isArray(picture) ? picture.filter((item) => typeof item === "string") : [];

    // Create the portfolio and initial project
    const portfolio = await prisma.portfolios.create({
      data: {
        id: randomUUID(),
        name: projectNameSafe,
        description: descriptionSafe,
        users: {
          connect: { id: currentUser.id }
        },
        updatedAt: now,
        projects: {
          create: [
            {
              id: randomUUID(),
              name: projectNameSafe,
              description: descriptionSafe,
              url: urlSafe,
              picture: pictureSafe,
              updatedAt: now
            }
          ]
        }
      },
      include: {
        users: true,
        projects: true
      }
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 