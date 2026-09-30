import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// GET /api/conversations/[id]/messages - Get messages for a conversation
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a participant in this conversation
    const participant = await prisma.conversation_participants.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get messages for this conversation
    const messages = await prisma.messages.findMany({
      where: {
        conversationId
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        messages: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Mark messages as read
    await prisma.messages.updateMany({
      where: {
        conversationId,
        senderId: { not: currentUser.id },
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    // Update last read timestamp
    await prisma.conversation_participants.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      },
      data: {
        lastReadAt: new Date()
      }
    });

    // Map messages to match frontend interface (sender instead of users, replyTo instead of messages)
    const formattedMessages = messages.map(msg => ({
      ...msg,
      sender: msg.users,
      replyTo: msg.messages || null
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Send a new message
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const { content, replyToId } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Get current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a participant in this conversation
    const participant = await prisma.conversation_participants.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Create the message
    const message = await prisma.messages.create({
      data: {
        id: crypto.randomUUID(),
        content,
        conversationId,
        senderId: currentUser.id,
        replyToId,
        messageId: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        messages: {
          include: {
            users: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversations.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // Map message to match frontend interface
    const formattedMessage = {
      ...message,
      sender: message.users,
      replyTo: message.messages || null
    };

    return NextResponse.json(formattedMessage, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
