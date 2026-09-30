import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log('Webhook body:', body);

  // Handle the webhook
  if (eventType === 'user.created') {
    const { id: userId, email_addresses, first_name, last_name, image_url } = evt.data;
    
    console.log('User created:', { userId, email_addresses, first_name, last_name, image_url });

    // Check if user already exists in our database
    const existingUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (existingUser && image_url) {
      // Sync Clerk's imageUrl to database picture field
      await prisma.users.update({
        where: { clerkId: userId },
        data: { picture: image_url }
      });
      console.log('Synced user picture from Clerk:', image_url);
    } else if (!existingUser) {
      console.log('User not found in database, but will be created through sign-up flow');
      // Don't create user here - let the sign-up flow create it with correct data
    }
  }

  if (eventType === 'user.updated') {
    const { id: userId, email_addresses, first_name, last_name, image_url } = evt.data;
    
    console.log('User updated:', { userId, email_addresses, first_name, last_name, image_url });

    // Update user details if they exist
    const existingUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (existingUser) {
      // Update user directly since profile is now part of User
      const updateData: any = {};
      
      if (first_name) {
        updateData.firstName = first_name;
        // If user is a client and firstName looks like a company name, also update companyName
        if (existingUser.role === 'client' && !last_name) {
          updateData.companyName = first_name;
        }
      }
      
      if (last_name) {
        updateData.lastName = last_name;
      }

      // Sync Clerk's imageUrl to database picture field
      if (image_url !== undefined) {
        updateData.picture = image_url;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.users.update({
          where: { clerkId: userId },
          data: updateData
        });
        console.log('Updated user:', { first_name, last_name, image_url, updateData });
      }
    }
  }

  if (eventType === 'user.deleted') {
    const { id: userId } = evt.data;
    
    console.log('User deleted from Clerk:', { userId });

    // Delete user from our database
    try {
      const deletedUser = await prisma.users.delete({
        where: { clerkId: userId }
      });
      
      console.log('Successfully deleted user from database:', {
        id: deletedUser.id,
        clerkId: deletedUser.clerkId,
        role: deletedUser.role
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        // User not found in database (already deleted or never existed)
        console.log('User not found in database (already deleted or never existed):', userId);
      } else {
        console.error('Error deleting user from database:', error);
      }
    }
  }

  return NextResponse.json({ success: true });
} 