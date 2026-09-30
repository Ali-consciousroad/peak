import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// GET /api/conflicts - List conflicts for the current user or all conflicts for admins
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

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const contractId = searchParams.get('contractId');

    let whereClause: any = {};

    // If user is admin, they can see all conflicts
    const userRole = role?.name || 'client';
    if (userRole === 'admin') {
      if (status) {
        whereClause.status = status;
      }
      if (contractId) {
        whereClause.contractId = contractId;
      }
    } else {
      // Regular users can see conflicts where:
      // 1. They created the conflict (reporterId)
      // 2. They are involved in the contract (client, freelancer, or admin of the contract)
      whereClause.OR = [
        { reporterId: user.id }, // Conflicts they created
        {
          contracts: {
            OR: [
              { freelancerId: user.id }, // They are the freelancer
              { adminId: user.id }, // They are the admin
              { missions: { clientId: user.id } } // They are the client of the mission
            ]
          }
        }
      ];
      
      if (status) {
        whereClause.status = status;
      }
      if (contractId) {
        whereClause.contractId = contractId;
      }
    }

    const conflicts = await prisma.conflicts.findMany({
      where: whereClause,
      include: {
        users_conflicts_reporterIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            users_contracts_adminIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            missions: {
              include: {
                users_missions_clientIdTousers: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                },
                payments: {
                  where: {
                    status: {
                      in: ['MADE', 'RELEASED_1', 'RELEASED_2']
                    }
                  },
                  select: {
                    id: true,
                    amount: true,
                    status: true,
                    paymentMethod: true,
                    transactionDate: true,
                    currencyId: true,
                    currencies: {
                      select: {
                        id: true,
                        code: true,
                        name: true
                      }
                    }
                  },
                  orderBy: {
                    transactionDate: 'desc'
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(conflicts);
  } catch (error) {
    console.error('❌ Error fetching conflicts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch conflicts', details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/conflicts - Create a new conflict
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contractId, motive, status = 'OPEN' } = await request.json();

    // Validate required fields
    if (!contractId || !motive) {
      return NextResponse.json(
        { error: 'Contract ID and motive are required' },
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

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    // Find the contract and verify user has access to it
    const contract = await prisma.contracts.findUnique({
      where: { id: contractId },
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

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Check if user has permission to create a conflict for this contract
    const isContractFreelancer = contract.freelancerId === user.id;
    const isContractAdmin = contract.adminId === user.id;
    const isMissionClient = contract.missions?.clientId === user.id;
    const userRole = role?.name || 'client';
    const isUserAdmin = userRole === 'admin';

    if (!isContractFreelancer && !isContractAdmin && !isMissionClient && !isUserAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Allow multiple conflicts per contract (0 to many)
    // No restriction on number of conflicts per user per contract

    // Optional: Auto-assign admin (round-robin for minimal admin involvement)
    // For decentralized approach, we can skip this and let parties resolve peer-to-peer
    let assignedAdminId: string | null = null;
    
    // Only auto-assign if explicitly requested (can be disabled for full decentralization)
    const autoAssignAdmin = process.env.AUTO_ASSIGN_CONFLICT_ADMIN !== 'false';
    
    if (autoAssignAdmin) {
      // Get all admins
      const adminRole = await prisma.roles.findFirst({
        where: { name: 'admin' }
      });

      if (adminRole) {
        const admins = await prisma.users.findMany({
          where: { roleId: adminRole.id },
          select: { id: true }
        });

        if (admins.length > 0) {
          // Simple round-robin: get admin with least assigned conflicts
          const adminConflictCounts = await Promise.all(
            admins.map(async (admin) => {
              const count = await prisma.conflicts.count({
                where: {
                  assignedAdminId: admin.id,
                  status: { in: ['OPEN', 'IN_REVIEW'] }
                }
              });
              return { adminId: admin.id, count };
            })
          );

          // Assign to admin with least conflicts
          const leastBusyAdmin = adminConflictCounts.reduce((prev, curr) =>
            curr.count < prev.count ? curr : prev
          );
          assignedAdminId = leastBusyAdmin.adminId;
        }
      }
    }

    const mission = contract.missions;
    const missionTitle = mission?.title || 'Mission';
    const missionId = mission?.id ?? null;
    const clientId = mission?.clientId ?? contract.missions?.clientId;

    const participantIds = new Set<string>();
    if (clientId) participantIds.add(clientId);
    participantIds.add(contract.freelancerId);
    if (assignedAdminId) {
      participantIds.add(assignedAdminId);
    }

    const notifyUserIds = new Set<string>([contract.freelancerId]);
    if (clientId) notifyUserIds.add(clientId);
    if (assignedAdminId) {
      notifyUserIds.add(assignedAdminId);
    }

    if (notifyUserIds.size === 0) {
      return NextResponse.json(
        { error: 'Cannot create a conflict without at least one notification recipient' },
        { status: 400 }
      );
    }

    const notificationMessage = `A conflict has been reported for "${missionTitle}". ${motive}`;
    const now = new Date();

    // Conflict + group conversation + notifications succeed or fail together
    const conflict = await prisma.$transaction(async (tx) => {
      const created = await tx.conflicts.create({
        data: {
          id: randomUUID(),
          contractId,
          motive,
          status,
          startDate: now,
          reporterId: user.id,
          assignedAdminId: assignedAdminId,
          createdAt: now,
          updatedAt: now
        },
      include: {
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            users_contracts_adminIdTousers: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            missions: {
              include: {
                users_missions_clientIdTousers: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                },
                payments: {
                  where: {
                    status: {
                      in: ['MADE', 'RELEASED_1', 'RELEASED_2']
                    }
                  },
                  select: {
                    id: true,
                    amount: true,
                    status: true,
                    paymentMethod: true,
                    transactionDate: true,
                    currencyId: true,
                    currencies: {
                      select: {
                        id: true,
                        code: true,
                        name: true
                      }
                    }
                  },
                  orderBy: {
                    transactionDate: 'desc'
                  }
                }
              }
            }
          }
        }
      }
    });

      await tx.conversations.create({
        data: {
          id: randomUUID(),
          conflictId: created.id,
          createdAt: now,
          updatedAt: now,
          conversation_participants: {
            create: Array.from(participantIds).map((participantUserId) => ({
              id: randomUUID(),
              userId: participantUserId
            }))
          }
        }
      });

      await tx.notifications.createMany({
        data: Array.from(notifyUserIds).map((uid) => ({
          id: randomUUID(),
          userId: uid,
          type: 'conflict_created',
          conflictId: created.id,
          missionId,
          title: `Conflict reported: ${missionTitle}`,
          message: notificationMessage,
          createdAt: now,
          updatedAt: now
        }))
      });

      return created;
    });

    return NextResponse.json(conflict, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating conflict:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create conflict', details: errorMessage },
      { status: 500 }
    );
  }
}
