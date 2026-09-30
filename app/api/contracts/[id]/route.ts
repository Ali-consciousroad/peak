import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/contracts/[id] - Get a specific contract
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      select: { id: true, roleId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    let userRole = 'client';
    if (user.roleId) {
      const role = await prisma.roles.findUnique({
        where: { id: user.roleId }
      });
      userRole = role?.name || 'client';
    }

    const contract = await prisma.contracts.findUnique({
      where: { id: params.id },
      include: {
        users_contracts_freelancerIdTousers: true, // Freelancer assigned to contract
        users_contracts_adminIdTousers: true, // Admin who approved contract
        missions: {
          include: {
            users_missions_clientIdTousers: true // Client who created the mission
          }
        }
      }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check if user has permission to view this contract
    const isContractFreelancer = contract.freelancerId === user.id;
    const isContractAdmin = contract.adminId === user.id;
    const isMissionClient = contract.missions.users_missions_clientIdTousers.id === user.id;
    const isUserAdmin = userRole === 'admin';

    if (!isContractFreelancer && !isContractAdmin && !isMissionClient && !isUserAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Map to expected frontend format
    const formattedContract = {
      ...contract,
      freelancer: contract.users_contracts_freelancerIdTousers,
      admin: contract.users_contracts_adminIdTousers,
      mission: {
        ...contract.missions,
        client: contract.missions.users_missions_clientIdTousers
      }
    };

    return NextResponse.json(formattedContract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
      { status: 500 }
    );
  }
}

// PUT /api/contracts/[id] - Update a contract
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      select: { id: true, roleId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    let userRole = 'client';
    if (user.roleId) {
      const role = await prisma.roles.findUnique({
        where: { id: user.roleId }
      });
      userRole = role?.name || 'client';
    }

    const { contractTerms, startDate, endDate } = await request.json();

    // Find the contract
    const existingContract = await prisma.contracts.findUnique({
      where: { id: params.id },
      include: {
        missions: {
          include: {
            users_missions_clientIdTousers: true
          }
        }
      }
    });

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check permissions - Only mission creator (client) can edit contracts
    const isMissionClient = existingContract.missions.users_missions_clientIdTousers.id === user.id;
    const isAdmin = userRole === 'admin';

    if (!isMissionClient && !isAdmin) {
      return NextResponse.json({ error: 'Only the mission creator can edit contracts' }, { status: 403 });
    }

    // Update the contract
    const updatedContract = await prisma.contracts.update({
      where: { id: params.id },
      data: {
        ...(contractTerms && { contractTerms }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
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

    // Map to expected frontend format
    const formattedContract = {
      ...updatedContract,
      freelancer: updatedContract.users_contracts_freelancerIdTousers,
      admin: updatedContract.users_contracts_adminIdTousers,
      mission: {
        ...updatedContract.missions,
        client: updatedContract.missions.users_missions_clientIdTousers
      }
    };

    return NextResponse.json(formattedContract);
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json(
      { error: 'Failed to update contract' },
      { status: 500 }
    );
  }
}
