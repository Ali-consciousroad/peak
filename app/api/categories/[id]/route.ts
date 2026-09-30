export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/categories/[id] - Get a specific category (public)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.categories.findUnique({
      where: { categoryId: params.id },
      include: {
        _count: {
          select: {
            missions: true
          }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Update a category (admin only)
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
        error: 'Forbidden: Only admins can update categories' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    // Check if category exists
    const existingCategory = await prisma.categories.findUnique({
      where: { categoryId: params.id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // If name is being updated, check for conflicts
    if (name && name !== existingCategory.name) {
      const nameConflict = await prisma.categories.findUnique({
        where: { name }
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 409 }
        );
      }
    }

    // Update the category
    const updatedCategory = await prisma.categories.update({
      where: { categoryId: params.id },
      data: {
        name: name || existingCategory.name,
        description: description !== undefined ? description : existingCategory.description,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete a category (admin only)
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
        error: 'Forbidden: Only admins can delete categories' 
      }, { status: 403 });
    }

    // Check if category exists
    const existingCategory = await prisma.categories.findUnique({
      where: { categoryId: params.id },
      include: {
        _count: {
          select: {
            missions: true,
            skills: true
          }
        }
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category has missions (prevent deletion if in use)
    if (existingCategory._count.missions > 0) {
      return NextResponse.json(
        { error: "Cannot delete category that has missions. Please reassign or delete the missions first." },
        { status: 400 }
      );
    }

    // Get request body to check for reassignToCategoryId
    const body = await request.json().catch(() => ({}));
    const { reassignToCategoryId } = body;

    // If category has skills, require reassignment
    if (existingCategory._count.skills > 0) {
      if (!reassignToCategoryId) {
        // Get skills in this category to show in error
        const skills = await prisma.skills.findMany({
          where: {
            categories: {
              some: {
                categoryId: params.id
              }
            }
          },
          select: {
            id: true,
            name: true
          }
        });

        return NextResponse.json(
          { 
            error: "Cannot delete category that has skills. Please reassign the skills to another category first.",
            skills: skills,
            skillCount: skills.length
          },
          { status: 400 }
        );
      }

      // Validate reassignment category exists and is different
      if (reassignToCategoryId === params.id) {
        return NextResponse.json(
          { error: "Cannot reassign skills to the same category." },
          { status: 400 }
        );
      }

      const reassignCategory = await prisma.categories.findUnique({
        where: { categoryId: reassignToCategoryId }
      });

      if (!reassignCategory) {
        return NextResponse.json(
          { error: "Reassignment category not found." },
          { status: 404 }
        );
      }

      // Reassign all skills to the new category
      const skillsToReassign = await prisma.skills.findMany({
        where: {
          categories: {
            some: {
              categoryId: params.id
            }
          }
        }
      });

      // Reassign each skill
      for (const skill of skillsToReassign) {
        await prisma.skills.update({
          where: { id: skill.id },
          data: {
            categories: {
              set: [{ categoryId: reassignToCategoryId }]
            }
          }
        });
      }
    }

    // Delete the category
    await prisma.categories.delete({
      where: { categoryId: params.id }
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
