import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('🚀 API CALLED: /api/freelancers/[id] with ID:', params.id);
  
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

    // Check permissions - allow clients, admins, and freelancers viewing their own profile
    const isOwnProfile = currentUser.id === params.id;
    const userRole = role?.name || 'client';
    if (userRole !== 'client' && userRole !== 'admin' && !(userRole === 'freelance' && isOwnProfile)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('✅ Access granted, fetching freelancer...');

    // Get freelance role ID first
    const freelanceRole = await prisma.roles.findFirst({
      where: { name: 'freelance' }
    });

    if (!freelanceRole) {
      return NextResponse.json({ error: 'Freelance role not found' }, { status: 500 });
    }

    // Simple query first - just get the basic user
    const basicFreelancer = await prisma.users.findFirst({
      where: { 
        id: params.id,
        roleId: freelanceRole.id
      }
    });

    if (!basicFreelancer) {
      return NextResponse.json({ error: 'Freelancer not found' }, { status: 404 });
    }

    console.log('✅ Basic freelancer found:', basicFreelancer.firstName, basicFreelancer.lastName);

    // Now try to get skills
    const skills = await prisma.skills.findMany({
      where: { 
        users: {
          some: {
            id: params.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        categories: {
          select: {
            name: true
          }
        }
      }
    });

    console.log('✅ Skills found:', skills.length);

    // Now try to get reviews
    const reviews = await prisma.reviews.findMany({
      where: { receiverId: params.id },
      select: {
        id: true,
        content: true,
        rating: true,
        createdAt: true,
        reviewerId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch reviewer details separately
    const reviewsWithReviewer = await Promise.all(reviews.map(async (review) => {
      const reviewer = await prisma.users.findUnique({
        where: { id: review.reviewerId },
        select: {
          firstName: true,
          lastName: true,
          companyName: true
        }
      });
      return {
        ...review,
        reviewer: reviewer || { firstName: null, lastName: null, companyName: null }
      };
    }));

    console.log('✅ Reviews found:', reviewsWithReviewer.length);

    // Get portfolio with projects
    const portfolio = await prisma.portfolios.findFirst({
      where: { userId: params.id },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            description: true,
            url: true,
            picture: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    console.log('✅ Portfolio found:', portfolio ? 'Yes' : 'No');
    if (portfolio) {
      console.log('✅ Projects count:', portfolio.projects.length);
    }

    // Calculate average rating
    const averageRating = reviewsWithReviewer.length > 0 
      ? reviewsWithReviewer.reduce((sum, review) => sum + review.rating, 0) / reviewsWithReviewer.length 
      : 0;

    // Return the data (sensitive payout fields only to the freelancer viewing their own profile)
    const responseData = {
      id: basicFreelancer.id,
      email: basicFreelancer.email,
      firstName: basicFreelancer.firstName,
      lastName: basicFreelancer.lastName,
      phoneNumber: basicFreelancer.phoneNumber,
      address: basicFreelancer.address,
      dailyRate: basicFreelancer.dailyRate,
      active: basicFreelancer.active,
      description: basicFreelancer.description,
      preferredPaymentMethod: basicFreelancer.preferredPaymentMethod,
      cryptoWalletAddress: basicFreelancer.cryptoWalletAddress,
      ...(isOwnProfile && {
        bankAccount: basicFreelancer.bankAccount
      }),
      createdAt: basicFreelancer.createdAt,
      updatedAt: basicFreelancer.updatedAt,
      skills: skills,
      portfolios: portfolio ? [{
        id: portfolio.id,
        name: portfolio.name,
        description: portfolio.description,
        projects: portfolio.projects
      }] : [],
      receivedReviews: reviewsWithReviewer,
      averageRating,
      reviewCount: reviews.length
    };
    
    console.log('✅ API Response - Skills count:', responseData.skills.length);
    console.log('✅ API Response - Reviews count:', responseData.receivedReviews?.length || 0);
    console.log('✅ API Response - Average rating:', responseData.averageRating);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Error fetching freelancer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('❌ Error details:', errorMessage);
    console.error('❌ Error stack:', errorStack);
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}