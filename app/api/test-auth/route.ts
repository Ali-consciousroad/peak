export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        authenticated: false, 
        message: "No userId from Clerk auth" 
      });
    }

    console.log('Clerk userId:', userId);

    // Check if user exists in database
    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ 
        authenticated: true, 
        userFound: false,
        clerkId: userId,
        message: "User not found in database" 
      });
    }

    return NextResponse.json({
      authenticated: true,
      userFound: true,
      userId: user.id,
      clerkId: user.clerkId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      message: "User found and authenticated"
    });

  } catch (error) {
    console.error("Error in test-auth:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
