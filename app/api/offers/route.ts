import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/offers - Get all offers (with filtering)
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const role = currentUser.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get('missionId');
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    
    // Security: Only allow users to see applications for their own missions
    const userRole = role?.name || 'client';
    if (userRole === 'client') {
      // Clients can only see applications for their own missions
      // First, get mission IDs for this client
      const clientMissions = await prisma.missions.findMany({
        where: { clientId: currentUser.id },
        select: { id: true }
      });
      const missionIds = clientMissions.map(m => m.id);
      
      if (missionId) {
        // If specific missionId is requested, verify it belongs to the client
        if (!missionIds.includes(missionId)) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        where.missionId = missionId;
      } else {
        // Otherwise, filter by all client's mission IDs
        // If no missions, return empty array
        if (missionIds.length === 0) {
          return NextResponse.json([]);
        }
        where.missionId = { in: missionIds };
      }
    } else if (userRole === 'freelance') {
      // Freelances can only see their own applications
      where.freelancerId = currentUser.id;
      if (missionId) where.missionId = missionId;
    } else if (userRole === 'admin') {
      // Admins can see all applications (no additional filtering)
      if (missionId) where.missionId = missionId;
      if (clientId) {
        const clientMissions = await prisma.missions.findMany({
          where: { clientId: clientId },
          select: { id: true }
        });
        const missionIds = clientMissions.map(m => m.id);
        if (missionIds.length === 0) {
          return NextResponse.json([]);
        }
        where.missionId = missionId ? missionId : { in: missionIds };
      }
    } else {
      // Other roles (support, etc.) - restrict access
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const offers = await prisma.offers.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        missions: {
          include: {
            users_missions_clientIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the response to match frontend expectations
    const transformedOffers = offers.map(offer => ({
      ...offer,
      freelancer: offer.users,
      mission: offer.missions ? {
        ...offer.missions,
        client: offer.missions.users_missions_clientIdTousers
      } : null
    }));

    return NextResponse.json(transformedOffers);
  } catch (error) {
    console.error('❌ Error fetching offers:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/offers - Create a new offer (client invites a builder)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { missionId, proposalText, dailyRate, startDate, endDate, freelancerId } = body;

    // Validate required fields
    if (!missionId || !proposalText || !dailyRate || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const role = currentUser.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    const userRole = role?.name || 'client';
    if (userRole !== 'client') {
      return NextResponse.json(
        { error: 'Only clients can make offers to builders' },
        { status: 403 }
      );
    }

    if (!freelancerId) {
      return NextResponse.json(
        { error: 'Missing freelancerId when making an offer' },
        { status: 400 }
      );
    }

    // Find the mission
    const mission = await prisma.missions.findUnique({
      where: { id: missionId },
      include: {
        users_missions_clientIdTousers: true,
        contracts: true
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check if mission is verified by admin
    if (!mission.isVerified) {
      return NextResponse.json(
        { error: 'This mission is pending admin verification and cannot receive offers yet' },
        { status: 400 }
      );
    }

    // Check if mission is still open (no active contract, or reopened after refund)
    const hasActiveContract = mission.contracts?.isActive === true;
    const isOpenForApplications = !hasActiveContract && !['COMPLETED', 'REFUNDED'].includes(mission.status);
    if (!isOpenForApplications) {
      return NextResponse.json(
        { error: 'This mission is no longer accepting applications' },
        { status: 400 }
      );
    }

    const targetFreelancer = await prisma.users.findUnique({
      where: { id: freelancerId }
    });

    if (!targetFreelancer) {
      return NextResponse.json(
        { error: 'Invalid builder' },
        { status: 400 }
      );
    }

    const freelancerRole = targetFreelancer.roleId
      ? await prisma.roles.findUnique({ where: { id: targetFreelancer.roleId } })
      : null;

    if (freelancerRole?.name !== 'freelance') {
      return NextResponse.json(
        { error: 'Invalid builder' },
        { status: 400 }
      );
    }

    const existingClientOffer = await prisma.offers.findFirst({
      // Allow re-proposing after REJECTED/CANCELLED by only blocking when there's an existing PENDING offer.
      where: { missionId, freelancerId, status: 'PENDING' }
    });

    if (existingClientOffer) {
      return NextResponse.json(
        { error: 'You already have a pending offer to this builder for this mission' },
        { status: 400 }
      );
    }

    // Create the offer
    const offer = await prisma.offers.create({
      data: {
        id: randomUUID(),
        status: 'PENDING',
        dailyRate,
        proposalText,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        freelancerId,
        missionId,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        missions: {
          include: {
            users_missions_clientIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      }
    });

    // Transform the response to match frontend expectations
    const transformedOffer = {
      ...offer,
      freelancer: offer.users,
      mission: {
        ...offer.missions,
        client: offer.missions.users_missions_clientIdTousers
      }
    };

    return NextResponse.json(transformedOffer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating offer:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}
