import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        authenticated: false, 
        message: "Not authenticated" 
      });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { role: true }
    });

    if (!user) {
      return NextResponse.json({ 
        authenticated: true, 
        userFound: false,
        message: "User not found in database" 
      });
    }

    const userRole = user.role?.name || 'client';
    const isFreelance = userRole === 'freelance';

    return NextResponse.json({
      authenticated: true,
      userFound: true,
      userId: user.id,
      role: userRole,
      canManageServices: isFreelance,
      message: isFreelance 
        ? "User can manage services" 
        : "User cannot manage services"
    });

  } catch (error) {
    console.error("Error in test-services-auth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 