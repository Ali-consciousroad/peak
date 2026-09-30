import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// This script helps sync Clerk IDs with existing users
// Run this when logged in as the user you want to fix

async function syncClerkId() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log('❌ No user authenticated. Please log in first.');
      return;
    }

    console.log('🔍 Current Clerk user ID:', userId);

    // Get the current user's email from Clerk
    // You'll need to get this from the Clerk dashboard or user object
    const userEmail = 'ali_dindar@live.be'; // Replace with the actual email

    // Find the user in the database
    const user = await prisma.users.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.log('❌ User not found in database:', userEmail);
      return;
    }

    console.log('🔍 Found user in database:', user.email, 'Role:', user.role);

    // Update the user with the Clerk ID
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { clerkId: userId }
    });

    console.log('✅ Successfully updated user with Clerk ID:', updatedUser.email);
    console.log('✅ Clerk ID:', updatedUser.clerkId);
    console.log('✅ Role:', updatedUser.role);

  } catch (error) {
    console.error('❌ Error syncing Clerk ID:', error);
  }
}

// Run the sync
syncClerkId();
