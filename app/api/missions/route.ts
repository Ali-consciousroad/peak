export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { randomUUID } from 'crypto';

// GET /api/missions - List all missions
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    // Get current user info to check role and permissions
    let currentUser = null;
    let isAdmin = false;
    let isClient = false;
    
    if (userId) {
      currentUser = await prisma.users.findUnique({
        where: { clerkId: userId }
      });
      if (currentUser) {
        const role = currentUser.roleId 
          ? await prisma.roles.findUnique({
              where: { id: currentUser.roleId }
            })
          : null;
        const userRole = role?.name || 'client';
        console.log('User role detected:', userRole);
        isAdmin = userRole === 'admin';
        isClient = userRole === 'client';
      }
    }

    // Build where clause based on user permissions - this endpoint shows "my missions"
    let whereClause: any = {};

    // If user is admin, show all missions (verified and unverified)
    if (isAdmin) {
      console.log('Admin user - showing all missions');
      // Admin can see all missions - no additional filtering needed
    } 
    // If user is client, show only their own missions (verified and unverified)
    else if (isClient && currentUser) {
      console.log('Client user - showing only their missions');
      whereClause.clientId = currentUser.id; // Only their own missions
    } 
    // For freelancers, show missions they're involved in (through contracts/offers)
    else if (currentUser) {
      console.log('Freelancer user - showing missions they are involved in');
      whereClause.OR = [
        { clientId: currentUser.id }, // Missions they created
        {
          AND: [
            {
              offers: {
                some: {
                  freelancerId: currentUser.id
                }
              }
            },
            {
              status: {
                not: 'REFUNDED'
              }
            }
          ]
        }, // Missions they've made offers on (exclude refunded)
        {
          contracts: {
            is: {
              freelancerId: currentUser.id
            }
          }
        } // Missions they have contracts for
      ];
    }
    // For unauthenticated users, show nothing
    else {
      console.log('Unauthenticated user - showing no missions');
      whereClause.id = 'nonexistent'; // This will return no results
    }

    console.log('Where clause:', JSON.stringify(whereClause, null, 2));

    const missions = await prisma.missions.findMany({
      where: whereClause,
      include: {
        users_missions_clientIdTousers: {
          include: {
            reviews_reviews_receiverIdTousers: {
              select: {
                id: true,
                content: true,
                rating: true,
                createdAt: true
              }
            }
          }
        },
        users_missions_verifierIdTousers: true, // Include verifier info
        categories: true, // Include categories
        contracts: true, // Include contract info
        payments: {
          select: {
            status: true,
            paymentMethod: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fix inconsistent data: missions with ACTIVE contracts should not remain OPEN
    const missionsToFix = missions
      .filter(mission => mission.status === 'OPEN' && mission.contracts?.isActive)
      .map(mission => mission.id);
    if (missionsToFix.length > 0) {
      await prisma.missions.updateMany({
        where: {
          id: { in: missionsToFix },
          status: 'OPEN'
        },
        data: {
          status: 'IN_PROGRESS',
          updatedAt: new Date()
        }
      });
    }

    // Calculate average ratings for clients and map to expected format
    const missionsWithRatings = missions.map(mission => {
      const client = mission.users_missions_clientIdTousers;
      const reviews = client?.reviews_reviews_receiverIdTousers || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews 
        : 0;

      // Destructure to remove Prisma relation fields
      const { users_missions_clientIdTousers, users_missions_verifierIdTousers, ...missionData } = mission as any;

      const normalizedStatus =
        missionData.status === 'OPEN' && mission.contracts?.isActive ? 'IN_PROGRESS' : missionData.status;

      return {
        ...missionData,
        status: normalizedStatus,
        client: client ? {
          id: client.id,
          email: client.email,
          firstName: client.firstName,
          lastName: client.lastName,
          role: 'client', // Frontend expects role string
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews
        } : null,
        verifier: mission.users_missions_verifierIdTousers ? {
          id: mission.users_missions_verifierIdTousers.id,
          firstName: mission.users_missions_verifierIdTousers.firstName,
          lastName: mission.users_missions_verifierIdTousers.lastName
        } : undefined,
        contract: mission.contracts || null,
        payments: mission.payments || []
      };
    });
    
    const userRoleName = currentUser && currentUser.roleId 
      ? (await prisma.roles.findUnique({ where: { id: currentUser.roleId } }))?.name || 'unknown'
      : 'unknown';
    console.log(`Returning ${missionsWithRatings.length} missions for user role: ${userRoleName}`);
    return NextResponse.json(missionsWithRatings);
  } catch (error) {
    console.error("Error fetching missions:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: "Failed to fetch missions",
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/missions - Create a new mission
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user
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

    // Check if user has client role
    const userRole = role?.name || 'client';
    const isClient = userRole === 'client';
    if (!isClient) {
      return NextResponse.json({ 
        error: 'Forbidden: Only clients can create missions' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { title, status, dailyRate, timeframe, description, timezone, startDate, endDate, categoryIds = [], skillIds = [] } = body;

    // Validate required fields
    if (!title || !description || !dailyRate || !timeframe || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, dailyRate, timeframe, startDate, endDate" },
        { status: 400 }
      );
    }

    // Validate that at least one skill is selected
    if (!skillIds || skillIds.length === 0) {
      return NextResponse.json(
        { error: "At least one skill must be selected" },
        { status: 400 }
      );
    }

    // Convert dd/mm/yyyy format to Date objects and validate calendar correctness
    const parseDate = (dateString: string): Date => {
      const [day, month, year] = dateString.split('/');
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);
      const parsed = new Date(parsedYear, parsedMonth - 1, parsedDay);
      const isValid =
        parsed.getFullYear() === parsedYear &&
        parsed.getMonth() === parsedMonth - 1 &&
        parsed.getDate() === parsedDay;

      if (!isValid) {
        throw new Error('Invalid date');
      }

      return parsed;
    };

    let parsedStartDate: Date;
    let parsedEndDate: Date;

    try {
      parsedStartDate = parseDate(startDate);
      parsedEndDate = parseDate(endDate);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid date format. Please use dd/mm/yyyy format" },
        { status: 400 }
      );
    }

    // Validate start/end boundaries against today
    const today = new Date();
    const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startAtMidnight = new Date(
      parsedStartDate.getFullYear(),
      parsedStartDate.getMonth(),
      parsedStartDate.getDate()
    );
    const endAtMidnight = new Date(
      parsedEndDate.getFullYear(),
      parsedEndDate.getMonth(),
      parsedEndDate.getDate()
    );

    if (startAtMidnight < todayAtMidnight) {
      return NextResponse.json(
        { error: "Start date cannot be in the past" },
        { status: 400 }
      );
    }

    if (endAtMidnight <= startAtMidnight) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Calculate deadline and grace period
    const deadline = new Date(parsedStartDate.getTime() + timeframe * 24 * 60 * 60 * 1000);
    const gracePeriodDays = Math.ceil(timeframe * 0.25); // 25% of timeframe
    const gracePeriodEnd = new Date(deadline.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

    // Create the mission
    // Explicitly set isVerified to false (even though schema has default, this ensures it's set)
    const mission = await prisma.missions.create({
      data: {
        id: randomUUID(),
        title,
        status: status || 'OPEN',
        dailyRate,
        timeframe,
        description,
        timezone,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        deadline,
        gracePeriodEnd,
        updatedAt: new Date(),
        clientId: currentUser.id, // Use the User.id directly
        isVerified: false, // Explicitly set to false for new missions
        skills: {
          connect: skillIds.map((skillId: string) => ({ id: skillId }))
        },
        categories: {
          connect: categoryIds.map((categoryId: string) => ({ categoryId }))
        }
      },
      include: {
        users_missions_clientIdTousers: true,
        categories: true,
        skills: true
      }
    });

    return NextResponse.json(mission, { status: 201 });
  } catch (error) {
    console.error("Error creating mission:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
 