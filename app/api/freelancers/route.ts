import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/freelancers - Get available builders for clients to browse
export async function GET(request: NextRequest) {
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

    // Only clients and admins can browse builders
    const userRole = role?.name || 'client';
    if (userRole !== 'client' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills') || '';
    const minRating = searchParams.get('minRating');
    const maxDailyRate = searchParams.get('maxDailyRate');
    const availableOnly = searchParams.get('availableOnly') === 'true';

    // Get freelance role ID
    const freelanceRole = await prisma.roles.findFirst({
      where: { name: 'freelance' }
    });

    if (!freelanceRole) {
      return NextResponse.json({ error: 'Freelance role not found' }, { status: 500 });
    }

    // Build where clause
    const where: any = {
      roleId: freelanceRole.id
    };

    // Filter by availability (only show available builders)
    if (availableOnly) {
      where.active = true;
    }

    // Search by name or email
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Note: Rating filtering is done after fetching, since rating is calculated from reviews
    // We'll filter by rating after calculating it from reviews

    // Filter by maximum daily rate
    if (maxDailyRate) {
      where.dailyRate = {
        lte: parseFloat(maxDailyRate)
      };
    }

    // Get builders with their skills
    console.log('Fetching builders with where clause:', where);
    const freelancers = await prisma.users.findMany({
      where,
      include: {
        skills: {
          select: {
            id: true,
            name: true,
            categories: {
              select: {
                name: true
              }
            }
          }
        },
        reviews_reviews_receiverIdTousers: {
          select: {
            id: true,
            content: true,
            rating: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('Found freelancers:', freelancers.length);
    if (freelancers.length > 0) {
      console.log('First freelancer:', freelancers[0]);
    }

    // Filter by skills if specified
    let filteredFreelancers = freelancers;
    if (skills) {
      const requiredSkills = skills.split(',').map(s => s.trim().toLowerCase());
      filteredFreelancers = freelancers.filter(freelancer => 
        freelancer.skills.some(skill => 
          requiredSkills.includes(skill.name.toLowerCase()) ||
          skill.categories.some(category => 
            requiredSkills.includes(category.name.toLowerCase())
          )
        )
      );
    }

    // Calculate average ratings
    let freelancersWithRatings = filteredFreelancers.map(freelancer => {
      const reviews = freelancer.reviews_reviews_receiverIdTousers || [];
      const averageRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
        : null;

      return {
        id: freelancer.id,
        firstName: freelancer.firstName,
        lastName: freelancer.lastName,
        email: freelancer.email,
        rating: averageRating,
        dailyRate: freelancer.dailyRate,
        active: freelancer.active,
        description: freelancer.description,
        averageRating,
        reviewCount: reviews.length,
        skills: freelancer.skills,
        portfolios: [],
        createdAt: freelancer.createdAt
      };
    });

    // Filter by minimum rating after calculating it
    if (minRating) {
      const minRatingValue = parseFloat(minRating);
      freelancersWithRatings = freelancersWithRatings.filter(freelancer => 
        freelancer.averageRating !== null && freelancer.averageRating >= minRatingValue
      );
    }

    return NextResponse.json(freelancersWithRatings);
  } catch (error) {
    console.error('Error fetching freelancers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch builders', details: errorMessage },
      { status: 500 }
    );
  }
}
