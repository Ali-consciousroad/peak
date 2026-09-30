import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// GET /api/payments - Get payments for the current user
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      include: { roles: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.roles?.name || 'client';

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get('missionId');
    const status = searchParams.get('status');

    let whereClause: any = {};

    // If user is admin, they can see all payments
    if (userRole === 'admin') {
      if (missionId) {
        whereClause.missionId = missionId;
      }
      if (status) {
        whereClause.status = status;
      }
    } else {
      // For regular users, if missionId is specified, they can see payments for missions they're involved in
      if (missionId) {
        // Check if user is involved in this mission (client or freelancer)
        const mission = await prisma.missions.findUnique({
          where: { id: missionId },
          include: {
            users_missions_clientIdTousers: true,
            contracts: {
              include: { 
                users_contracts_freelancerIdTousers: true
              }
            }
          }
        });

        if (mission) {
          const isClient = mission.clientId === user.id;
          const isFreelancer = mission.contracts?.freelancerId === user.id;
          
          if (isClient || isFreelancer) {
            // User is involved in this mission, show payments for this mission
            whereClause.missionId = missionId;
          } else {
            // User is not involved, return empty array
            return NextResponse.json([]);
          }
        } else {
          return NextResponse.json([]);
        }
      } else {
        // No missionId specified, show payments where user is involved
        // For clients: show payments for missions they own
        // For freelancers: show payments for missions they're working on
        if (userRole === 'client') {
          // Clients see payments for missions they own
          whereClause.missions = {
            clientId: user.id
          };
        } else if (userRole === 'freelance') {
          // Freelancers see payments for missions they have contracts for
          whereClause.missions = {
            contracts: {
              freelancerId: user.id
            }
          };
        } else {
          // Fallback: show payments where userId matches
          whereClause.userId = user.id;
        }
      }
      
      if (status) {
        whereClause.status = status;
      }
    }

    console.log('Payments query whereClause:', JSON.stringify(whereClause, null, 2));
    console.log(`Querying payments for client user: ${user.id} (${user.email})`);
    
    const payments = await prisma.payments.findMany({
      where: whereClause,
      include: {
        missions: {
          include: {
            users_missions_clientIdTousers: true,
            contracts: {
              include: {
                users_contracts_freelancerIdTousers: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    preferredPaymentMethod: true,
                    cryptoWalletAddress: true
                  }
                }
              }
            }
          }
        },
        currencies: true,
        users: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Query returned ${payments.length} payments for user ${user.id} (role: ${userRole})`);
    console.log('Payment mission titles:', payments.map(p => p.missions?.title || 'No title'));

    // Always return payments as an array (removed missions needing payments since contracts page handles that)
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: 'Failed to fetch payments', 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create a new payment (prepay for mission)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      include: { roles: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = user.roles?.name || 'client';

    // Only clients can create payments (prepay for missions)
    if (userRole !== 'client') {
      return NextResponse.json(
        { error: 'Only clients can create payments' },
        { status: 403 }
      );
    }

    const { missionId, amount, paymentMethod, currencyId } = await request.json();
    console.log('POST /api/payments - Request data:', { missionId, amount, paymentMethod, currencyId });

    // Validate required fields
    if (!missionId || !amount || !paymentMethod || !currencyId) {
      return NextResponse.json(
        { error: 'Missing required fields: missionId, amount, paymentMethod, currencyId' },
        { status: 400 }
      );
    }

    // Find the mission
    console.log('Finding mission:', missionId);
    const mission = await prisma.missions.findUnique({
      where: { id: missionId },
      include: { users_missions_clientIdTousers: true }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Check if the user owns this mission
    if (mission.clientId !== user.id) {
      return NextResponse.json(
        { error: 'You can only pay for your own missions' },
        { status: 403 }
      );
    }

    // Check if mission is verified
    if (!mission.isVerified) {
      return NextResponse.json(
        { error: 'Mission must be verified before payment can be made' },
        { status: 400 }
      );
    }

    // Check if mission already has a contract
    const existingContract = await prisma.contracts.findUnique({
      where: { missionId }
    });

    if (!existingContract) {
      return NextResponse.json(
        { error: 'Mission must have a contract before payment can be made' },
        { status: 400 }
      );
    }

    // Check if an active escrow-lifecycle payment already exists for this mission.
    // Historical records (e.g. conflict refunds) should not block creating a new payment.
    const existingPayment = await prisma.payments.findFirst({
      where: {
        missionId,
        status: { in: ['PENDING', 'MADE', 'RELEASED_1', 'RELEASED_2'] }
      }
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Payment already exists for this mission' },
        { status: 400 }
      );
    }

    // Find the currency - clients always pay in EUR
    console.log('Finding currency:', currencyId);
    const currency = await prisma.currencies.findUnique({
      where: { id: currencyId }
    });
    console.log('Currency found:', currency ? { id: currency.id, code: currency.code } : 'NOT FOUND');

    if (!currency) {
      return NextResponse.json(
        { error: 'Invalid currency selected' },
        { status: 400 }
      );
    }

    // Ensure client is paying in EUR (builder's preferred payment method is handled at release time)
    if (currency.code !== 'EUR') {
      return NextResponse.json(
        { error: 'Clients must pay in EUR. Builder payment preferences are handled at release time.' },
        { status: 400 }
      );
    }

    // Create the payment (escrow)
    console.log('Creating payment with data:', {
      amount: parseFloat(amount),
      paymentMethod,
      missionId,
      userId: user.id,
      currencyId: currency.id
    });
    const payment = await prisma.payments.create({
      data: {
        id: randomUUID(),
        amount: parseFloat(amount),
        paymentMethod,
        transactionDate: new Date(),
        updatedAt: new Date(),
        missionId,
        status: 'PENDING', // Payment pending admin verification
        userId: user.id,
        currencyId: currency.id
      },
      include: {
        missions: true,
        currencies: true,
        users: true
      }
    });

    // Update mission status to indicate payment is made
    await prisma.missions.update({
      where: { id: missionId },
      data: { status: 'IN_PROGRESS' }
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: 'Failed to create payment', 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
