import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 /api/me: Starting request...');
    
    const { userId } = await auth();
    console.log('🔍 /api/me: Auth result - userId:', userId);
    
    if (!userId) {
      console.log('❌ /api/me: No userId from auth');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 /api/me: Looking for user with clerkId:', userId);
    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    console.log('🔍 /api/me: Database query result:', user ? 'User found' : 'User not found');
    
    if (!user) {
      console.log('❌ /api/me: User not found in database for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    const roleName = role?.name || 'client';

    return NextResponse.json({
      id: user.id,
      email: user.email,
      clerkId: user.clerkId,
      description: user.description,
      roles: [roleName], // Keep array format for backward compatibility
      role: roleName, // Primary role
      isClient: roleName === 'client',
      isFreelance: roleName === 'freelance',
      isAdmin: roleName === 'admin',
      isSupport: roleName === 'support',
      active: user.active,
      dailyRate: user.dailyRate,
      picture: user.picture, // Synced from Clerk's imageUrl
      preferredPaymentMethod: user.preferredPaymentMethod,
      cryptoWalletAddress: user.cryptoWalletAddress,
      // Profile data is now directly in user object
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        phoneNumber: user.phoneNumber,
        address: user.address,
        bankAccount: user.bankAccount,
        walletAddress: user.cryptoWalletAddress,
        vat: user.vat,
        picture: user.picture, // Also include in profile for convenience
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, address, dailyRate } = body;

    console.log('🔍 /api/me PUT: Updating user contact info:', { userId, phoneNumber, address, dailyRate });

    // Find the user
    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address !== undefined) updateData.address = address;
    if (typeof dailyRate === 'number' && dailyRate >= 0) {
      updateData.dailyRate = dailyRate;
    }

    console.log('🔍 /api/me PUT: Update data:', updateData);

    // Update user
    const updatedUser = await prisma.users.update({
      where: { clerkId: userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    console.log('✅ /api/me PUT: User updated successfully');

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        address: updatedUser.address,
        dailyRate: updatedUser.dailyRate
      }
    });

  } catch (error) {
    console.error('❌ /api/me PUT: Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user information' },
      { status: 500 }
    );
  }
} 