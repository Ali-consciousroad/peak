export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET /api/categories - List all categories (public)
export async function GET() {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        _count: {
          select: {
            missions: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category (admin only)
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

    // Check if user has admin role
    const userRole = role?.name || 'client';
    const isAdmin = userRole === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Only admins can create categories' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name is required" },
        { status: 400 }
      );
    }

    // Check if category with this name already exists
    const existingCategory = await prisma.categories.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 409 }
      );
    }

    // Create the category
    const category = await prisma.categories.create({
      data: {
        categoryId: randomUUID(),
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: currentUser.id
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { 
        error: "Internal Server Error",
        details: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
