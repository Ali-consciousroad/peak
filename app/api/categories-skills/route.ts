export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/categories-skills - Get all categories with their skills
export async function GET() {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        skills: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories and skills:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories and skills" },
      { status: 500 }
    );
  }
}
