import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clerkId = searchParams.get("clerkId");

    if (!clerkId) {
      console.error("No Clerk ID provided in request");
      return NextResponse.json(
        { error: "Clerk ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching role for Clerk ID: ${clerkId}`);

    const user = await prisma.users.findUnique({
      where: { clerkId },
    });

    if (!user) {
      console.error(`No user found for Clerk ID: ${clerkId}`);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user role (now a simple attribute)
    const role = user.role || 'client';

    console.log(`Found role ${role} for Clerk ID: ${clerkId}`);
    return NextResponse.json({ 
      roles: [role], // Keep array format for backward compatibility
      role: role // Primary role
    });
  } catch (error) {
    console.error("Error in /api/users/role:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 