import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  let userId: string | null = null;
  let normalizedRole: string | undefined = undefined;
  let role: string | undefined = undefined;
  
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestData = await request.json();
    role = requestData.role;
    const { firstName, lastName, company } = requestData;
    
    // Validate required fields
    if (!role) {
      return NextResponse.json({ error: 'Missing role' }, { status: 400 });
    }

    // Normalize role to lowercase for validation and storage
    normalizedRole = role.toLowerCase();
    
    if (!['client', 'freelance'].includes(normalizedRole)) {
      return NextResponse.json({ error: 'Invalid role. Must be client or freelance' }, { status: 400 });
    }

    // Validate role-specific fields
    if (normalizedRole === 'freelance' && (!firstName || !lastName)) {
      return NextResponse.json({ error: 'First name and last name are required for builders' }, { status: 400 });
    }

    if (normalizedRole === 'client' && !company) {
      return NextResponse.json({ error: 'Company name is required for clients' }, { status: 400 });
    }

    console.log('Creating user profile:', { userId, role: normalizedRole, firstName, lastName, company });

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({ 
      where: { clerkId: userId },
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User profile already exists',
        user: existingUser 
      }, { status: 409 });
    }

    // Get user email from Clerk
    let userEmail = 'temp@example.com';
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      userEmail = clerkUser.emailAddresses[0]?.emailAddress || 'temp@example.com';
    } catch (err) {
      console.warn('Could not fetch email from Clerk:', err);
    }

    // Get the role ID for the selected role
    const roleRecord = await prisma.roles.findUnique({
      where: { name: normalizedRole }
    });

    if (!roleRecord) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const companyName = normalizedRole === 'client' ? String(company) : null;
    const builderFirstName = normalizedRole === 'freelance' ? String(firstName) : null;
    const builderLastName = normalizedRole === 'freelance' ? String(lastName) : null;

    const createData: Prisma.usersCreateInput = {
      id: randomUUID(),
      clerkId: userId,
      email: userEmail,
      roles: {
        connect: { id: roleRecord.id }
      },
      updatedAt: new Date()
    };

    if (normalizedRole === 'client') {
      createData.firstName = companyName;
      createData.lastName = '';
      createData.companyName = companyName;
    } else {
      createData.firstName = builderFirstName;
      createData.lastName = builderLastName;
    }

    // Create new user with selected role and profile data
    const newUser = await prisma.users.create({
      data: createData
    });

    console.log('Created new user profile:', newUser);

    // Update Clerk user with profile information
    try {
      if (normalizedRole === 'freelance' && firstName && lastName) {
        await clerkClient.users.updateUser(userId, {
          firstName: firstName,
          lastName: lastName,
        });
        console.log(`Updated Clerk user name to: ${firstName} ${lastName}`);
      } else if (normalizedRole === 'client' && company) {
        await clerkClient.users.updateUser(userId, {
          firstName: company,
          lastName: '',
        });
        console.log(`Updated Clerk user name to: ${company}`);
      }
    } catch (clerkError) {
      console.error('Error updating Clerk user:', clerkError);
      // Don't fail the request if Clerk update fails, but log it
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        clerkId: newUser.clerkId,
        role: normalizedRole,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      }
    });

  } catch (error) {
    console.error('Error creating user profile:', error);
    
    // Enhanced error logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        role: normalizedRole
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to create user profile' },
      { status: 500 }
    );
  }
} 