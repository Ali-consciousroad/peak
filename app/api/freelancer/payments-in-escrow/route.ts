import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/freelancer/payments-in-escrow - MADE payments still in escrow (active contracts)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the user
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

    // Only freelancers can access this endpoint
    const userRole = role?.name || 'client';
    if (userRole !== 'freelance') {
      return NextResponse.json({ error: 'Only freelancers can view payments in escrow' }, { status: 403 });
    }

    // Find all contracts for this freelancer that have payments with status 'MADE' (in escrow)
    const contracts = await prisma.contracts.findMany({
      where: {
        freelancerId: user.id,
        isActive: true
      },
      include: {
        missions: {
          include: {
            users_missions_clientIdTousers: true,
            payments: {
              where: {
                status: 'MADE', // Still in escrow (released payments have another status)
              },
              include: {
                currencies: true
              },
              orderBy: {
                transactionDate: 'desc'
              }
            }
          }
        }
      }
    });

    // Filter contracts that have payments in escrow
    const contractsWithPayments = contracts.filter(contract => 
      contract.missions.payments && contract.missions.payments.length > 0
    );

    // Format the response
    const paymentsInEscrow = contractsWithPayments.map(contract => ({
      contractId: contract.id,
      missionId: contract.missions.id,
      missionTitle: contract.missions.title,
      clientName: contract.missions.users_missions_clientIdTousers.firstName && contract.missions.users_missions_clientIdTousers.lastName
        ? `${contract.missions.users_missions_clientIdTousers.firstName} ${contract.missions.users_missions_clientIdTousers.lastName}`
        : contract.missions.users_missions_clientIdTousers.email.split('@')[0],
      clientEmail: contract.missions.users_missions_clientIdTousers.email,
      payment: {
        id: contract.missions.payments[0].id,
        amount: contract.missions.payments[0].amount,
        status: contract.missions.payments[0].status,
        transactionDate: contract.missions.payments[0].transactionDate,
        seenByFreelancerAt: contract.missions.payments[0].seenByFreelancerAt,
        currency: contract.missions.payments[0].currencies
      },
      dailyRate: contract.dailyRate,
      startDate: contract.startDate,
      endDate: contract.endDate
    }));

    return NextResponse.json(paymentsInEscrow);
  } catch (error) {
    console.error('Error fetching payments in escrow:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

