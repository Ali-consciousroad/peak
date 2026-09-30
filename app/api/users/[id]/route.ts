import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userToDelete = await prisma.users.findUnique({
      where: { id: params.id }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow users to delete their own account or admin to delete any account
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId },
      include: { role: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Check if user can delete this account
    const userRole = currentUser.role?.name || 'client';
    const isAdmin = userRole === 'admin';
    const canDelete = isAdmin || userToDelete.clerkId === userId;
    
    if (!canDelete) {
      return NextResponse.json({ 
        error: 'Forbidden: You can only delete your own account or need admin privileges' 
      }, { status: 403 });
    }

    console.log(`Deleting user: ${userToDelete.email}`);

    // Finally delete the user
    console.log('Deleting user record...');
    await prisma.users.delete({
      where: { id: params.id }
    });

    console.log('✅ User deleted successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 