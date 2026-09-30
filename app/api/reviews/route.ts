import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET /api/reviews - Get all reviews (with optional filtering)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get('receiverId');
    const reviewerId = searchParams.get('reviewerId');
    const missionId = searchParams.get('missionId');

    const where: any = {};

    if (receiverId) {
      where.receiverId = receiverId;
    }

    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    if (missionId) {
      where.missionId = missionId;
    }

    const reviews = await prisma.reviews.findMany({
      where,
      include: {
        users_reviews_reviewerIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roleId: true
          },
        },
        users_reviews_receiverIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roleId: true
          },
        },
        missions: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch roles for reviewers and receivers
    const roleIds = Array.from(
      new Set(
        [
          ...reviews.map(r => r.users_reviews_reviewerIdTousers?.roleId),
          ...reviews.map(r => r.users_reviews_receiverIdTousers?.roleId)
        ].filter((id): id is string => Boolean(id))
      )
    );
    const roles = roleIds.length > 0 
      ? await prisma.roles.findMany({
          where: { id: { in: roleIds as string[] } }
        })
      : [];
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    // Transform the data to flatten role.name to role
    const transformedReviews = reviews.map(review => ({
      ...review,
      reviewer: {
        ...review.users_reviews_reviewerIdTousers,
        role: review.users_reviews_reviewerIdTousers?.roleId ? roleMap.get(review.users_reviews_reviewerIdTousers.roleId) || null : null,
      },
      receiver: {
        ...review.users_reviews_receiverIdTousers,
        role: review.users_reviews_receiverIdTousers?.roleId ? roleMap.get(review.users_reviews_receiverIdTousers.roleId) || null : null,
      },
      mission: review.missions,
    }));

    return NextResponse.json(transformedReviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, missionId, content, rating } = body;

    // Validate required fields
    if (!receiverId || !missionId || !content || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: receiverId, missionId, content, and rating are required' },
        { status: 400 }
      );
    }

    // Validate rating (1-5 stars)
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to review themselves
    if (currentUser.id === receiverId) {
      return NextResponse.json(
        { error: 'Cannot review yourself' },
        { status: 400 }
      );
    }

    // Verify that the mission exists and the current user is involved
    const mission = await prisma.missions.findUnique({
      where: { id: missionId },
      include: {
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: true,
            users_contracts_adminIdTousers: true,
          },
        },
      },
    });

    if (!mission) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

    // Check if the current user is involved in this mission (client, freelancer, or admin)
    const isClient = mission.clientId === currentUser.id;
    const isFreelancer = mission.contracts?.freelancerId === currentUser.id;
    const isAdmin = mission.contracts?.adminId === currentUser.id;

    if (!isClient && !isFreelancer && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only review people you have worked with on this mission' },
        { status: 403 }
      );
    }

    // Verify that the receiver is also involved in this mission
    const isReceiverClient = mission.clientId === receiverId;
    const isReceiverFreelancer = mission.contracts?.freelancerId === receiverId;
    const isReceiverAdmin = mission.contracts?.adminId === receiverId;

    if (!isReceiverClient && !isReceiverFreelancer && !isReceiverAdmin) {
      return NextResponse.json(
        { error: 'You can only review people who were involved in this mission' },
        { status: 403 }
      );
    }

    // Check if user has already reviewed this person for this mission
    const existingReview = await prisma.reviews.findFirst({
      where: {
        reviewerId: currentUser.id,
        receiverId,
        missionId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this person for this mission' },
        { status: 400 }
      );
    }

    // Create the review
    const review = await prisma.reviews.create({
      data: {
        id: randomUUID(),
        content: String(content),
        rating: Number(rating),
        reviewerId: currentUser.id,
        receiverId: String(receiverId),
        missionId: String(missionId),
        updatedAt: new Date(),
      },
      include: {
        users_reviews_reviewerIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roleId: true
          },
        },
        users_reviews_receiverIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roleId: true
          },
        },
        missions: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Fetch roles
    const roleIds = [
      review.users_reviews_reviewerIdTousers?.roleId,
      review.users_reviews_receiverIdTousers?.roleId
    ].filter(Boolean) as string[];
    const roles = roleIds.length > 0 
      ? await prisma.roles.findMany({
          where: { id: { in: roleIds } }
        })
      : [];
    const roleMap = new Map(roles.map(r => [r.id, r.name]));

    // Transform the data to flatten role.name to role
    const transformedReview = {
      ...review,
      reviewer: {
        ...review.users_reviews_reviewerIdTousers,
        role: review.users_reviews_reviewerIdTousers?.roleId ? roleMap.get(review.users_reviews_reviewerIdTousers.roleId) || null : null,
      },
      receiver: {
        ...review.users_reviews_receiverIdTousers,
        role: review.users_reviews_receiverIdTousers?.roleId ? roleMap.get(review.users_reviews_receiverIdTousers.roleId) || null : null,
      },
      mission: review.missions,
    };

    return NextResponse.json(transformedReview, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
