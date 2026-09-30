import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// PUT /api/me/description - Update current user's description
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description } = body;

    if (typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description must be a string' },
        { status: 400 }
      );
    }

    const trimmedDescription = description.trim();
    
    if (trimmedDescription.length < 150) {
      return NextResponse.json(
        { error: 'Description must be at least 150 characters long' },
        { status: 400 }
      );
    }

    if (trimmedDescription.length > 1500) {
      return NextResponse.json(
        { error: 'Description must be no more than 1500 characters long' },
        { status: 400 }
      );
    }

    // Update the user's description
    const updatedUser = await prisma.users.update({
      where: { clerkId: userId },
      data: { description: trimmedDescription }
    });

    return NextResponse.json({
      success: true,
      description: updatedUser.description
    });

  } catch (error) {
    console.error('Error updating description:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
