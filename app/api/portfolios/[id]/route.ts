import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/portfolios/[id] - Get a single portfolio (public)
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const portfolio = await prisma.portfolios.findUnique({
      where: { id: params.id },
      include: {
        users: true
      },
    });

    if (!portfolio) {
      return new NextResponse(
        JSON.stringify({ error: "Portfolio not found" }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new NextResponse(
      JSON.stringify(portfolio),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// PUT /api/portfolios/[id] - Update a portfolio (requires authentication)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectUrl, name, description, picture } = await request.json();

    // First, find the portfolio to check if it exists and if the user owns it
    const existingPortfolio = await prisma.portfolios.findUnique({
      where: { id: params.id },
      include: {
        users: true
      }
    });

    if (!existingPortfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Get the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    // Fetch role separately
    const role = currentUser?.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    const isOwner = existingPortfolio.userId === currentUser?.id;
    const userRole = role?.name || 'client';
    const isAdmin = userRole === 'admin';

    // Check if the user owns this portfolio or is an admin
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own portfolios' }, { status: 403 });
    }

    // Build update data object, only including fields that are provided
    const updateData: {
      url?: string;
      name?: string;
      description?: string;
      picture?: string[];
    } = {};

    if (projectUrl !== undefined) updateData.url = projectUrl;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (picture !== undefined) updateData.picture = picture;

    const updatedPortfolio = await prisma.portfolios.update({
      where: {
        id: params.id,
      },
      data: updateData,
      include: {
        users: true
      }
    });
    return NextResponse.json(updatedPortfolio);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio" },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolios/[id] - Delete a portfolio (requires authentication)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, find the portfolio to check if it exists and if the user owns it
    const portfolio = await prisma.portfolios.findUnique({
      where: { id: params.id },
      include: {
        users: true
      }
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Get the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    // Fetch role separately
    const role = currentUser?.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    const isOwner = portfolio.userId === currentUser?.id;
    const isAdmin = role?.name === 'admin';

    // Check if the user owns this portfolio or is an admin
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own portfolios' }, { status: 403 });
    }

    // Delete the portfolio
    await prisma.portfolios.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true, message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return NextResponse.json(
      { error: "Failed to delete portfolio" },
      { status: 500 }
    );
  }
} 