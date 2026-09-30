export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/services/[id] - Get a single service (public)
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: params.id },
      include: {
        user: true
      },
    });

    if (!service) {
      return new NextResponse(
        JSON.stringify({ error: "Service not found" }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new NextResponse(
      JSON.stringify(service),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching service:", error);
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

// PUT /api/services/[id] - Update a service (requires authentication)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, price, description } = await request.json();

    // First, find the service to check if it exists and if the user owns it
    const existingService = await prisma.service.findUnique({
      where: { id: params.id },
      include: {
        user: true
      }
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Get the current user's role
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    const isOwner = existingService.userId === currentUser?.id;
    const isAdmin = currentUser?.role === 'admin';

    // Check if the user owns this service or is an admin
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own services' }, { status: 403 });
    }

    const updatedService = await prisma.service.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        price,
        description,
      },
      include: {
        user: true
      }
    });
    return NextResponse.json(updatedService);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

// DELETE /api/services/[id] - Delete a service (requires authentication)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, find the service to check if it exists and if the user owns it
    const service = await prisma.service.findUnique({
      where: { id: params.id },
      include: {
        user: true
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Get the current user's role
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    const isOwner = service.userId === currentUser?.id;
    const isAdmin = currentUser?.role === 'admin';

    // Check if the user owns this service or is an admin
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own services' }, { status: 403 });
    }

    await prisma.service.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
} 