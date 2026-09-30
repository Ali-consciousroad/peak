import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// GET /api/contracts - List contracts for the current user
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user in our database
    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    // Get all contracts for this user
    // The user's role determines their relationship to the contract
    const contracts = await prisma.contracts.findMany({
      where: {
        OR: [
          // Contracts where user is the freelancer
          { freelancerId: user.id },
          // Contracts where user is the admin
          { adminId: user.id },
          // Contracts for missions created by this user (if they're a client)
          { missions: { clientId: user.id } }
        ]
      },
      include: {
        users_contracts_freelancerIdTousers: true, // The freelancer assigned to the contract
        users_contracts_adminIdTousers: true, // The admin who approved the contract
        missions: {
          include: {
            users_missions_clientIdTousers: true // The client who created the mission
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fix data inconsistency: Update missions with contracts that are still OPEN to IN_PROGRESS
    const missionsToFix = contracts
      .filter(c => c.missions.status === 'OPEN')
      .map(c => c.missions.id);
    
    if (missionsToFix.length > 0) {
      console.log(`[Contracts API] Fixing ${missionsToFix.length} mission(s) with contracts but status is OPEN`);
      await prisma.missions.updateMany({
        where: {
          id: { in: missionsToFix },
          status: 'OPEN'
        },
        data: {
          status: 'IN_PROGRESS',
          updatedAt: new Date()
        }
      });
    }

    // Transform contracts to match frontend expectations
    const transformedContracts = contracts.map(contract => ({
      ...contract,
      freelancer: contract.users_contracts_freelancerIdTousers,
      admin: contract.users_contracts_adminIdTousers,
      mission: {
        ...contract.missions,
        client: contract.missions.users_missions_clientIdTousers,
        // Ensure status is correct (should be IN_PROGRESS if contract exists)
        status: contract.missions.status === 'OPEN' ? 'IN_PROGRESS' : contract.missions.status
      }
    }));

    // Debug: Log seenByClientAt for client's contracts
    if (role?.name === 'client') {
      const clientContracts = transformedContracts.filter((c: any) => c.mission?.clientId === user.id);
      console.log(`[Contracts API] Client ${user.id} has ${clientContracts.length} contracts`);
      clientContracts.forEach((c: any) => {
        console.log(`[Contracts API] Contract ${c.id}: seenByClientAt = ${c.seenByClientAt}`);
      });
    }

    return NextResponse.json(transformedContracts);
  } catch (error) {
    console.error('❌ Error fetching contracts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    const errorName = error instanceof Error ? error.name : 'Unknown';
    console.error('❌ Error name:', errorName);
    console.error('❌ Error message:', errorMessage);
    console.error('❌ Error stack:', errorStack);
    if (error instanceof Error && 'code' in error) {
      console.error('❌ Error code:', (error as any).code);
    }
    return NextResponse.json(
      { error: 'Failed to fetch contracts', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/contracts - Create a new contract
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { missionId, contractTerms, startDate, endDate, dailyRate } = await request.json();

    // Validate required fields
    if (!missionId || !contractTerms || !startDate || !endDate || !dailyRate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the mission
    const mission = await prisma.missions.findUnique({
      where: { id: missionId },
      include: { users_missions_clientIdTousers: true }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check if contract already exists for this mission
    const existingContract = await prisma.contracts.findFirst({
      where: { missionId }
    });

    if (existingContract) {
      return NextResponse.json(
        { error: 'Contract already exists for this mission' },
        { status: 400 }
      );
    }

    // Find admin role first
    const adminRole = await prisma.roles.findFirst({
      where: { name: 'admin' }
    });

    if (!adminRole) {
      return NextResponse.json(
        { error: 'Admin role not found' },
        { status: 500 }
      );
    }

    // Find an admin user to approve the contract
    const adminUser = await prisma.users.findFirst({
      where: { 
        roleId: adminRole.id
      }
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'No admin user found to approve contract' },
        { status: 500 }
      );
    }

    // Create the contract - requires both freelancer and admin
    const contract = await prisma.contracts.create({
      data: {
        id: randomUUID(),
        contractTerms,
        dailyRate: parseFloat(dailyRate),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        missionId,
        isActive: true,
        freelancerId: user.id, // User creating the contract is the freelancer
        adminId: adminUser.id, // Admin approves the contract
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

    // Transform the response to match frontend expectations
    const transformedContract = {
      ...contract,
      freelancer: contract.users_contracts_freelancerIdTousers,
      admin: contract.users_contracts_adminIdTousers,
      mission: {
        ...contract.missions,
        client: contract.missions.users_missions_clientIdTousers
      }
    };

    // Update mission status to IN_PROGRESS
    await prisma.missions.update({
      where: { id: missionId },
      data: { status: 'IN_PROGRESS' }
    });

    return NextResponse.json(transformedContract, { status: 201 });
  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    );
  }
}