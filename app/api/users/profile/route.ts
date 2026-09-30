import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { validateIban } from '@/lib/iban-validation';
import { NextResponse } from 'next/server';

const ALLOWED_PAYMENT_METHODS = new Set(['EUR', 'BTC', 'ETH', 'AVAX', 'SOL']);

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      firstName,
      lastName,
      companyName,
      active,
      dailyRate,
      preferredPaymentMethod,
      cryptoWalletAddress,
      bankAccount
    } = await request.json();

    console.log('Updating user profile:', { userId, firstName, lastName, companyName, dailyRate });

    // Find the user
    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      select: { id: true, roleId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    let userRole = 'client';
    if (user.roleId) {
      const role = await prisma.roles.findUnique({
        where: { id: user.roleId }
      });
      userRole = role?.name || 'client';
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (companyName) updateData.companyName = companyName;
    if (typeof active === 'boolean') updateData.active = active;
    if (typeof dailyRate === 'number' && dailyRate >= 0) {
      updateData.dailyRate = dailyRate;
      console.log('Setting dailyRate to:', dailyRate);
    }
    if (
      typeof preferredPaymentMethod === 'string' &&
      ALLOWED_PAYMENT_METHODS.has(preferredPaymentMethod)
    ) {
      updateData.preferredPaymentMethod = preferredPaymentMethod;
    }

    if (cryptoWalletAddress !== undefined) {
      if (cryptoWalletAddress === null) {
        updateData.cryptoWalletAddress = null;
      } else if (typeof cryptoWalletAddress === 'string') {
        const t = cryptoWalletAddress.trim();
        updateData.cryptoWalletAddress = t.length > 0 ? t : null;
      }
    }
    if (bankAccount !== undefined) {
      const trimmed = typeof bankAccount === 'string' ? bankAccount.trim() : '';
      if (trimmed.length === 0) {
        updateData.bankAccount = null;
      } else {
        const ibanResult = validateIban(trimmed);
        if (!ibanResult.ok) {
          return NextResponse.json({ error: ibanResult.message }, { status: 400 });
        }
        updateData.bankAccount = ibanResult.electronic;
      }
    }

    console.log('Update data:', updateData);

    // Update user directly (no separate profile table)
    const updatedUser = await prisma.users.update({
      where: { clerkId: userId },
      data: updateData
    });

    console.log('Updated database profile:', updatedUser);

    // Sync changes to Clerk
    try {
      if (firstName && lastName) {
        // Update firstName and lastName for all roles
        await clerkClient.users.updateUser(userId, {
          firstName: firstName,
          lastName: lastName,
        });
        console.log(`Updated Clerk user name to: ${firstName} ${lastName}`);
      }
      
      // For clients, also sync companyName if provided
      if (userRole === 'client' && companyName) {
        // Note: We store companyName in our database, but Clerk only has firstName/lastName
        // The companyName is displayed in our app UI, not in Clerk's UI
        console.log(`Updated company name to: ${companyName} (stored in database)`);
      }
    } catch (clerkError) {
      console.error('Error updating Clerk user:', clerkError);
      // Don't fail the request if Clerk update fails, but log it
    }

    return NextResponse.json({
      success: true,
      profile: updatedUser
    });

  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Failed to update user profile', message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
} 