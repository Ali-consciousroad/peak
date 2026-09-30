import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json({ 
      clerkId: userId,
      message: 'This is your Clerk ID. Copy this value.'
    });
  } catch (error) {
    console.error('Error getting Clerk ID:', error);
    return NextResponse.json(
      { error: 'Failed to get Clerk ID' },
      { status: 500 }
    );
  }
}
