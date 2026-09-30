export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// GET /api/admin/missions - Get all missions for admin (regardless of status)
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user info to verify admin role
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

    // Only admins can access this endpoint
    const userRole = role?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get ALL missions (verified and unverified, all statuses)
    const missions = await prisma.missions.findMany({
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
        users_missions_verifierIdTousers: true,
        categories: true,
        contracts: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate average ratings for clients
    const missionsWithRatings = missions.map(mission => {
      const client = mission.users_missions_clientIdTousers;
      const reviews = client?.reviews_reviews_receiverIdTousers || [];
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 
        ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / totalReviews 
        : 0;

      return {
        ...mission,
        client: client ? {
          ...client,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews,
          receivedReviews: undefined // Remove the reviews array from response
        } : null
      };
    });
    
    return NextResponse.json(missionsWithRatings);
  } catch (error) {
    console.error("Error fetching admin missions:", error);
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
