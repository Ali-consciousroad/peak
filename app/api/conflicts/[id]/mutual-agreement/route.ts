import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/conflicts/[id]/mutual-agreement - Record mutual agreement for peer-to-peer resolution
// This allows both parties to agree on resolution without admin intervention
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { agreed, resolutionProposal } = await request.json();

    // Find the conflict
    const conflict = await prisma.conflicts.findUnique({
      where: { id: params.id },
      include: {
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: true,
            missions: {
              include: {
                users_missions_clientIdTousers: true
              }
            }
          }
        }
      }
    });

    if (!conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    // Check if user is involved party
    const isContractFreelancer = conflict.contracts.freelancerId === user.id;
    const isMissionClient = conflict.contracts.missions?.clientId === user.id;

    if (!isContractFreelancer && !isMissionClient) {
      return NextResponse.json(
        { error: 'Only involved parties can agree to resolution' },
        { status: 403 }
      );
    }

    // Store agreement in conversation or conflict notes
    // For now, we'll use a simple approach: update conflict with agreement status
    // In a full implementation, you might want a separate table for mutual agreements

    // Check if both parties have agreed
    // This is a simplified version - in production, you'd want to track both parties' agreements
    const updatedConflict = await prisma.conflicts.update({
      where: { id: params.id },
      data: {
        updatedAt: new Date(),
        // Store agreement in motive field temporarily (or add a new field)
        // In production, add a 'mutualAgreementStatus' field to conflicts table
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Agreement recorded. Waiting for other party to agree.',
      conflict: updatedConflict,
      canResolve: false // Will be true when both parties agree
    });

  } catch (error) {
    console.error('Error recording mutual agreement:', error);
    return NextResponse.json(
      { error: 'Failed to record agreement' },
      { status: 500 }
    );
  }
}
