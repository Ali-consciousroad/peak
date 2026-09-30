import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

// PUT /api/offers/[id] - Update offer status (accept/reject)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, rejectionMessage } = await request.json();
    const offerId = params.id;

    // Validate status
    if (!['ACCEPTED', 'REJECTED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACCEPTED, REJECTED, or CANCELLED' },
        { status: 400 }
      );
    }

    // Find the offer
    const offer = await prisma.offers.findUnique({
      where: { id: offerId },
      include: {
        missions: {
          include: {
            users_missions_clientIdTousers: true
          }
        },
        users: true
      }
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Find the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is authorized to update this offer
    const isMissionOwner = currentUser.id === offer.missions.users_missions_clientIdTousers.id;
    const isFreelancer = currentUser.id === offer.freelancerId;
    
    if (!isMissionOwner && !isFreelancer) {
      return NextResponse.json(
        { error: 'You can only update offers you made or received' },
        { status: 403 }
      );
    }

    // Check if the user is trying to perform an allowed action
    if (status === 'CANCELLED' && !isMissionOwner) {
      return NextResponse.json(
        { error: 'Only the client can cancel offers' },
        { status: 403 }
      );
    }

    if ((status === 'ACCEPTED' || status === 'REJECTED') && !isFreelancer) {
      return NextResponse.json(
        { error: 'Only the builder can accept/reject this offer' },
        { status: 403 }
      );
    }

    // Check if offer is still pending
    if (offer.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This application has already been processed' },
        { status: 400 }
      );
    }

    // Update the offer status
    const updatedOffer = await prisma.offers.update({
      where: { id: offerId },
      data: { status, updatedAt: new Date() },
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

    // If rejecting with a message, create conversation and send message
    if (status === 'REJECTED' && rejectionMessage && rejectionMessage.trim()) {
      try {
        // Check if conversation already exists between these users for this mission
        console.log('Looking for existing conversation for mission:', offer.missions.id, 'user:', currentUser.id);
        const existingConversation = await prisma.conversations.findFirst({
          where: {
            missionId: offer.missions.id,
            conversation_participants: {
              some: {
                userId: currentUser.id
              }
            }
          },
          include: {
            conversation_participants: true
          }
        });

        console.log('Found existing conversation:', existingConversation);
        let conversationId;
        if (existingConversation) {
          conversationId = existingConversation.id;
          console.log('Using existing conversation:', conversationId);
        } else {
          // Create new conversation
          const newConversation = await prisma.conversations.create({
            data: {
              id: crypto.randomUUID(),
              missionId: offer.missions.id,
              createdAt: new Date(),
              updatedAt: new Date(),
              conversation_participants: {
                create: [
                  { id: crypto.randomUUID(), userId: currentUser.id },
                  { id: crypto.randomUUID(), userId: offer.missions.users_missions_clientIdTousers.id }
                ]
              }
            }
          });
          conversationId = newConversation.id;
        }

        // Send the rejection message
        await prisma.messages.create({
          data: {
            id: crypto.randomUUID(),
            content: rejectionMessage.trim(),
            senderId: currentUser.id,
            conversationId: conversationId,
            createdAt: new Date(),
            updatedAt: new Date(),
            messageId: crypto.randomUUID()
          }
        });

        console.log(`Rejection message sent: ${rejectionMessage.trim()}`);
      } catch (conversationError) {
        console.error('Error creating conversation/message for rejection:', conversationError);
        // Don't fail the offer rejection if conversation creation fails
      }
    }

    // If offer is accepted, create a contract and update mission status
    if (status === 'ACCEPTED') {
      // Check if mission is still available for accepting a new contract.
      // Mission status alone isn't enough in this app; we also rely on contract.isActive.
      if (['COMPLETED', 'REFUNDED'].includes(offer.missions.status)) {
        return NextResponse.json(
          { error: 'This mission is no longer available for new contracts' },
          { status: 400 }
        );
      }

      // Check if mission already has a contract
      const existingContract = await prisma.contracts.findUnique({
        where: { missionId: offer.missions.id }
      });

      // If there is an ACTIVE contract, block creating/re-activating another one.
      if (existingContract?.isActive) {
        return NextResponse.json(
          { error: 'An active contract already exists for this mission' },
          { status: 400 }
        );
      }

      // Find an admin user to approve the contract
      const adminRole = await prisma.roles.findFirst({
        where: { name: 'admin' }
      });

      if (!adminRole) {
        return NextResponse.json(
          { error: 'No admin role found' },
          { status: 500 }
        );
      }

      const adminUser = await prisma.users.findFirst({
        where: { 
          roleId: adminRole.id
        },
        select: { id: true }
      });

      if (!adminUser) {
        return NextResponse.json(
          { error: 'No admin user found to approve contract' },
          { status: 500 }
        );
      }

      // Create or re-activate the contract for this mission.
      // contracts.missionId is UNIQUE, so if a contract row already exists (but is inactive),
      // we update it instead of creating a new one.
      const contract = existingContract
        ? await prisma.contracts.update({
            where: { id: existingContract.id },
            data: {
              contractTerms: `Contract created from accepted application. ${offer.proposalText}`,
              dailyRate: offer.dailyRate,
              startDate: offer.startDate,
              endDate: offer.endDate,
              isActive: true,
              freelancerId: offer.freelancerId,
              adminId: adminUser.id,
              updatedAt: new Date()
            },
            include: {
              users_contracts_freelancerIdTousers: true,
              users_contracts_adminIdTousers: true,
              missions: {
                include: {
                  users_missions_clientIdTousers: true
                }
              }
            }
          })
        : await prisma.contracts.create({
            data: {
              id: randomUUID(),
              contractTerms: `Contract created from accepted application. ${offer.proposalText}`,
              dailyRate: offer.dailyRate,
              startDate: offer.startDate,
              endDate: offer.endDate,
              missionId: offer.missions.id,
              isActive: true,
              freelancerId: offer.freelancerId,
              adminId: adminUser.id,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            include: {
              users_contracts_freelancerIdTousers: true,
              users_contracts_adminIdTousers: true,
              missions: {
                include: {
                  users_missions_clientIdTousers: true
                }
              }
            }
          });

      // Update mission status to IN_PROGRESS
      await prisma.missions.update({
        where: { id: offer.missions.id },
        data: { status: 'IN_PROGRESS', updatedAt: new Date() }
      });

      // Cancel all other pending offers for this mission
      await prisma.offers.updateMany({
        where: {
          missionId: offer.missions.id,
          status: 'PENDING',
          id: { not: offerId }
        },
        data: { status: 'CANCELLED', updatedAt: new Date() }
      });

      return NextResponse.json({
        offer: updatedOffer,
        contract: contract
      });
    }

    return NextResponse.json({ offer: updatedOffer });
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/offers/[id] - Delete an offer
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const offerId = params.id;

    // Find the offer
    const offer = await prisma.offers.findUnique({
      where: { id: offerId },
      include: {
        users: true,
        missions: {
          include: {
            users_missions_clientIdTousers: true
          }
        }
      }
    });

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Find the current user
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is the offer creator (freelancer) or mission owner
    const isOfferCreator = currentUser.id === offer.freelancerId;
    const isMissionOwner = currentUser.id === offer.missions.users_missions_clientIdTousers.id;

    if (!isOfferCreator && !isMissionOwner) {
      return NextResponse.json(
        { error: 'You can only delete your own applications or applications to your missions' },
        { status: 403 }
      );
    }

    // Delete the offer
    await prisma.offers.delete({
      where: { id: offerId }
    });

    return NextResponse.json({ message: 'Offer deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting offer:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}
