import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// POST /api/conversations/start - Start a conversation with another user
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { otherUserId, missionId } = await request.json();
    
    console.log('Start conversation request:', { otherUserId, missionId });

    if (!otherUserId) {
      return NextResponse.json({ error: 'Other user ID is required' }, { status: 400 });
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if conversation already exists between these specific users for this mission
    const existingConversation = await prisma.conversations.findFirst({
      where: {
        AND: [
          {
            missionId: missionId
          },
          {
            conversation_participants: {
              some: {
                userId: currentUser.id
              }
            }
          },
          {
            conversation_participants: {
              some: {
                userId: otherUserId
              }
            }
          }
        ]
      },
      include: {
        conversation_participants: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (existingConversation) {
      console.log('Found existing conversation:', existingConversation.id);
      return NextResponse.json({ 
        conversationId: existingConversation.id,
        message: 'Conversation already exists'
      });
    }

    // Create new conversation
    const conversation = await prisma.conversations.create({
      data: {
        id: crypto.randomUUID(),
        missionId: missionId,
        createdAt: new Date(),
        updatedAt: new Date(),
        conversation_participants: {
          create: [
            { 
              id: crypto.randomUUID(),
              userId: currentUser.id
            },
            { 
              id: crypto.randomUUID(),
              userId: otherUserId
            }
          ]
        }
      },
      include: {
        conversation_participants: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    console.log('Created new conversation:', conversation.id);
    return NextResponse.json({ 
      conversationId: conversation.id,
      message: 'Conversation created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to start conversation' },
      { status: 500 }
    );
  }
}
