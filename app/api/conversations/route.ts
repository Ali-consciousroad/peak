import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// GET /api/conversations - Get all conversations for the current user
export async function GET() {
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

    // Get all conversations where the user is a participant
    // For conflict discussions, we need to ensure privacy - users should only see their own conversations
    const conversations = await prisma.conversations.findMany({
      where: {
        conversation_participants: {
          some: {
            userId: currentUser.id
          }
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
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        missions: {
          select: {
            id: true,
            title: true
          }
        },
        conflicts: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Format conversations with unread count and other user info
    const formattedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        // Get the other participant (not the current user)
        const otherParticipant = conversation.conversation_participants.find(
          p => p.users.id !== currentUser.id
        );

        // Get unread message count
        const unreadCount = await prisma.messages.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: currentUser.id },
            isRead: false
          }
        });

        return {
          id: conversation.id,
          missionId: conversation.missionId,
          otherUser: otherParticipant?.users,
          lastMessage: conversation.messages[0] || null,
          messages: conversation.messages, // Include all messages for our logic
          participants: conversation.conversation_participants, // Include participants for our logic
          unreadCount,
          updatedAt: conversation.updatedAt,
          conflictId: conversation.conflictId,
          conflict: conversation.conflicts,
          mission: conversation.missions
        };
      })
    );

    console.log('Conversations API: Returning', formattedConversations.length, 'conversations');
    console.log('Sample conversation:', formattedConversations[0]);
    
    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { otherUserId, conflictId } = await request.json();
    
    console.log('Conversation creation request:', { otherUserId, conflictId });

    // For now, only support 1-on-1 conversations
    if (!otherUserId) {
      return NextResponse.json({ error: 'otherUserId is required' }, { status: 400 });
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate that the other user exists
    const otherUser = await prisma.users.findUnique({
      where: { id: otherUserId },
      select: { id: true }
    });

    if (!otherUser) {
      console.error('Other user does not exist:', otherUserId);
      return NextResponse.json({ 
        error: 'Other user does not exist', 
        otherUserId 
      }, { status: 400 });
    }

    // For conflict discussions, we need to ensure privacy - each party should only see their own conversation with admin
    let existingConversation;
    
    if (conflictId) {
      // For conflict discussions, check if there's already a conversation between these specific users for this specific conflict
      existingConversation = await prisma.conversations.findFirst({
        where: {
          AND: [
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
            },
            {
              conflictId: conflictId
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
    } else {
      // For general conversations, check if there's already a conversation between these users
      existingConversation = await prisma.conversations.findFirst({
        where: {
          AND: [
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
    }

    if (existingConversation) {
      // Format the existing conversation to match the expected format
      const otherParticipant = existingConversation.conversation_participants.find(
        p => p.users.id !== currentUser.id
      );
      
      const formattedConversation = {
        id: existingConversation.id,
        otherUser: otherParticipant?.users,
        lastMessage: null, // Will be populated by the GET endpoint
        unreadCount: 0,
        updatedAt: existingConversation.updatedAt
      };
      
      return NextResponse.json(formattedConversation);
    }

    // Create new conversation
    const conversation = await prisma.conversations.create({
      data: {
        id: randomUUID(),
        conflictId: conflictId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        conversation_participants: {
          create: [
            { 
              id: randomUUID(),
              userId: currentUser.id
            },
            { 
              id: randomUUID(),
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

    // Format the new conversation to match the expected format
    const otherParticipant = conversation.conversation_participants.find(
      p => p.users.id !== currentUser.id
    );
    
    const formattedConversation = {
      id: conversation.id,
      otherUser: otherParticipant?.users,
      lastMessage: null,
      unreadCount: 0,
      updatedAt: conversation.updatedAt
    };

    return NextResponse.json(formattedConversation, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack
    });
    return NextResponse.json(
      { error: 'Failed to create conversation', details: errorMessage },
      { status: 500 }
    );
  }
}
