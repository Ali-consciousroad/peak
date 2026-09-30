import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/conflicts/[id] - Get a specific conflict
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

    const conflict = await prisma.conflicts.findUnique({
      where: { id: params.id },
      include: {
        users_conflicts_reporterIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        users_conflicts_assignedAdminIdTousers: {
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
                }
              }
            }
          }
        }
      }
    });

    if (!conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    // Check if user has permission to view this conflict
    const isContractFreelancer = conflict.contracts.freelancerId === user.id;
    const isContractAdmin = conflict.contracts.adminId === user.id;
    const isMissionClient = conflict.contracts.missions?.clientId === user.id;
    const userRole = role?.name || 'client';
    const isUserAdmin = userRole === 'admin';

    if (!isContractFreelancer && !isContractAdmin && !isMissionClient && !isUserAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(conflict);
  } catch (error) {
    console.error('Error fetching conflict:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflict' },
      { status: 500 }
    );
  }
}

// PUT /api/conflicts/[id] - Update a conflict (mainly for status changes by admins)
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

    const { status, endDate, motive, assignedAdminId } = await request.json();

    // Find the conflict
    const conflict = await prisma.conflicts.findUnique({
      where: { id: params.id },
      include: {
        users_conflicts_reporterIdTousers: true,
        users_conflicts_assignedAdminIdTousers: true,
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: true,
            users_contracts_adminIdTousers: true,
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

    // Check permissions
    const isContractFreelancer = conflict.contracts.freelancerId === user.id;
    const isContractAdmin = conflict.contracts.adminId === user.id;
    const isMissionClient = conflict.contracts.missions?.clientId === user.id;
    const userRole = role?.name || 'client';
    const isUserAdmin = userRole === 'admin';

    // Only admins can change status and end date
    // Users can only update the motive if the conflict is still open
    if (status && !isUserAdmin) {
      return NextResponse.json({ error: 'Only admins can change conflict status' }, { status: 403 });
    }

    if (endDate && !isUserAdmin) {
      return NextResponse.json({ error: 'Only admins can set conflict end date' }, { status: 403 });
    }

    if (!isContractFreelancer && !isContractAdmin && !isMissionClient && !isUserAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If user is not admin, they can only update motive for open conflicts
    if (!isUserAdmin && conflict.status !== 'OPEN') {
      return NextResponse.json({ error: 'Cannot update closed conflicts' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (endDate) updateData.endDate = new Date(endDate);
    if (motive) updateData.motive = motive;
    if (assignedAdminId !== undefined) updateData.assignedAdminId = assignedAdminId;

    const updatedConflict = await prisma.conflicts.update({
      where: { id: params.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        users_conflicts_reporterIdTousers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        users_conflicts_assignedAdminIdTousers: {
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
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedConflict);
  } catch (error) {
    console.error('Error updating conflict:', error);
    return NextResponse.json(
      { error: 'Failed to update conflict' },
      { status: 500 }
    );
  }
}

// DELETE /api/conflicts/[id] - Delete a conflict (only for admins)
export async function DELETE(
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

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    // Only admins can delete conflicts
    const userRole = role?.name || 'client';
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const conflict = await prisma.conflicts.findUnique({
      where: { id: params.id }
    });

    if (!conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    await prisma.conflicts.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Conflict deleted successfully' });
  } catch (error) {
    console.error('Error deleting conflict:', error);
    return NextResponse.json(
      { error: 'Failed to delete conflict' },
      { status: 500 }
    );
  }
}
