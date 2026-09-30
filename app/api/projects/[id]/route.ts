export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/projects/[id] - Get a specific project
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.projects.findUnique({
      where: { id: params.id },
      include: {
        portfolios: {
          include: {
            users: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId },
      include: { roles: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission (freelancers only)
    const userRole = currentUser.roles?.name || 'client';
    const isFreelance = userRole === 'freelance';
    if (!isFreelance) {
      return NextResponse.json({ 
        error: 'Forbidden: Only builders can update projects' 
      }, { status: 403 });
    }

    // Get the project and verify ownership
    const project = await prisma.projects.findUnique({
      where: { id: params.id },
      include: {
        portfolios: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify the project belongs to the user's portfolio
    if (project.portfolios.userId !== currentUser.id) {
      return NextResponse.json({ 
        error: 'Forbidden: You can only update your own projects' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, url, picture } = body;

    // Validate required fields
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Update the project
    const updatedProject = await prisma.projects.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : project.name,
        description: description !== undefined ? (description?.trim() || null) : project.description,
        url: url !== undefined ? (url?.trim() || null) : project.url,
        picture: picture !== undefined ? picture : project.picture,
      },
      include: {
        portfolios: {
          include: {
            users: true
          }
        }
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId },
      include: { roles: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission (freelancers only)
    const userRole = currentUser.roles?.name || 'client';
    const isFreelance = userRole === 'freelance';
    if (!isFreelance) {
      return NextResponse.json({ 
        error: 'Forbidden: Only builders can delete projects' 
      }, { status: 403 });
    }

    // Get the project and verify ownership
    const project = await prisma.projects.findUnique({
      where: { id: params.id },
      include: {
        portfolios: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify the project belongs to the user's portfolio
    if (project.portfolios.userId !== currentUser.id) {
      return NextResponse.json({ 
        error: 'Forbidden: You can only delete your own projects' 
      }, { status: 403 });
    }

    // Delete the project
    await prisma.projects.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}

