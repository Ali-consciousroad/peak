export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import {
  endDateDdMmYyyyFromStartAndTimeframe,
  formatDateToDdMmYyyy,
  parseDdMmYyyy,
  timeframeDaysFromDdMmYyyyRange,
} from "@/lib/mission-dates";

// GET /api/missions/[id] - Get a single mission
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mission = await prisma.missions.findUnique({
      where: { id: params.id },
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
                roleId: true,
              },
            },
          },
        },
        payments: true,
        categories: true,
        skills: true,
        users_missions_verifierIdTousers: true,
      },
    });

    if (!mission) {
      return new NextResponse(
        JSON.stringify({ error: "Mission not found" }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });
    if (!currentUser) {
      return new NextResponse(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const role = currentUser.roleId
      ? await prisma.roles.findUnique({ where: { id: currentUser.roleId } })
      : null;
    const isAdmin = role?.name === 'admin';

    let builderPayoutForAdmin: {
      preferredPaymentMethod: string | null;
      bankAccount: string | null;
      cryptoWalletAddress: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null = null;

    const freelancerId = mission.contracts?.freelancerId;
    if (isAdmin && freelancerId) {
      const payoutProfile = await prisma.users.findUnique({
        where: { id: freelancerId },
        select: {
          preferredPaymentMethod: true,
          bankAccount: true,
          cryptoWalletAddress: true,
          firstName: true,
          lastName: true,
          email: true
        }
      });
      if (payoutProfile) {
        builderPayoutForAdmin = payoutProfile;
      }
    }

    // Normalize status: IN_PROGRESS/OVERDUE + inactive contract => OPEN (reopened after refund)
    const normalizedStatus =
      (mission.status === 'IN_PROGRESS' || mission.status === 'OVERDUE') && !mission.contracts?.isActive
        ? 'OPEN'
        : mission.status;

    // Transform the response to match frontend expectations
    const transformedMission = {
      ...mission,
      status: normalizedStatus,
      client: mission.users_missions_clientIdTousers,
      verifier: mission.users_missions_verifierIdTousers,
      contract: mission.contracts,
      ...(builderPayoutForAdmin !== null && { builderPayoutForAdmin }),
    };

    return new NextResponse(JSON.stringify(transformedMission), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate'
      }
    });
  } catch (error) {
    console.error("Error fetching mission:", error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// PUT /api/missions/[id] - Update a mission
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      status,
      dailyRate,
      timeframe,
      categoryIds,
      skillIds,
      startDate: startDateRaw,
      endDate: endDateRaw,
    } = body;

    // First, find the mission to check if it exists and if the user owns it
    const existingMission = await prisma.missions.findUnique({
      where: { id: params.id },
      include: {
        users_missions_clientIdTousers: true,
        contracts: true,
      },
    });

    if (!existingMission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Get the current user's role
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    // Fetch role separately
    const role = currentUser?.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    const isOwner = existingMission.clientId === currentUser?.id;
    const userRole = role?.name || 'client';
    const isAdmin = userRole === 'admin';

    // Check if the user owns this mission or is an admin
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own missions' }, { status: 403 });
    }

    const hasActiveContract = existingMission.contracts?.isActive === true;
    const normalizedExistingStatus =
      (existingMission.status === "IN_PROGRESS" ||
        existingMission.status === "OVERDUE") &&
      !hasActiveContract
        ? "OPEN"
        : existingMission.status;
    const allowMissionDateEdit =
      !hasActiveContract &&
      !["IN_PROGRESS", "COMPLETED", "OVERDUE"].includes(normalizedExistingStatus);

    const startDateStr =
      typeof startDateRaw === "string" ? startDateRaw.trim() : "";
    const endDateStr = typeof endDateRaw === "string" ? endDateRaw.trim() : "";
    const wantsDateUpdate = Boolean(startDateStr && endDateStr);

    if ((startDateStr && !endDateStr) || (!startDateStr && endDateStr)) {
      return NextResponse.json(
        { error: "Both startDate and endDate are required (dd/mm/yyyy)" },
        { status: 400 },
      );
    }

    if (wantsDateUpdate && !allowMissionDateEdit) {
      return NextResponse.json(
        {
          error:
            "Start and end dates can only be changed before the mission is assigned (no active contract).",
        },
        { status: 403 },
      );
    }

    const today = new Date();
    const todayAtMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    type SchedulePatch = {
      startDate: Date;
      endDate: Date;
      timeframe: number;
      deadline: Date;
      gracePeriodEnd: Date;
    };

    let schedulePatch: SchedulePatch | undefined;

    if (wantsDateUpdate && allowMissionDateEdit) {
      let parsedStartDate: Date;
      let parsedEndDate: Date;
      try {
        parsedStartDate = parseDdMmYyyy(startDateStr);
        parsedEndDate = parseDdMmYyyy(endDateStr);
      } catch {
        return NextResponse.json(
          { error: "Invalid date format. Use dd/mm/yyyy" },
          { status: 400 },
        );
      }

      const startAtMidnight = new Date(
        parsedStartDate.getFullYear(),
        parsedStartDate.getMonth(),
        parsedStartDate.getDate(),
      );
      const endAtMidnight = new Date(
        parsedEndDate.getFullYear(),
        parsedEndDate.getMonth(),
        parsedEndDate.getDate(),
      );

      if (startAtMidnight < todayAtMidnight) {
        return NextResponse.json(
          { error: "Start date cannot be in the past" },
          { status: 400 },
        );
      }

      if (endAtMidnight <= startAtMidnight) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 },
        );
      }

      let derivedTimeframe: number;
      try {
        derivedTimeframe = timeframeDaysFromDdMmYyyyRange(
          startDateStr,
          endDateStr,
        );
      } catch {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 },
        );
      }

      const deadline = new Date(
        parsedStartDate.getTime() + derivedTimeframe * 24 * 60 * 60 * 1000,
      );
      const gracePeriodDays = Math.ceil(derivedTimeframe * 0.25);
      const gracePeriodEnd = new Date(
        deadline.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000,
      );

      schedulePatch = {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        timeframe: derivedTimeframe,
        deadline,
        gracePeriodEnd,
      };
    } else if (
      allowMissionDateEdit &&
      !wantsDateUpdate &&
      timeframe != null &&
      existingMission.startDate
    ) {
      const tf = Number(timeframe);
      if (!Number.isFinite(tf) || tf < 1) {
        return NextResponse.json(
          { error: "Timeframe must be a positive number" },
          { status: 400 },
        );
      }
      const startStr = formatDateToDdMmYyyy(new Date(existingMission.startDate));
      let endStr: string;
      try {
        endStr = endDateDdMmYyyyFromStartAndTimeframe(startStr, tf);
      } catch {
        return NextResponse.json(
          { error: "Could not update end date from timeframe" },
          { status: 400 },
        );
      }
      let parsedEndDate: Date;
      try {
        parsedEndDate = parseDdMmYyyy(endStr);
      } catch {
        return NextResponse.json(
          { error: "Invalid derived end date" },
          { status: 400 },
        );
      }
      const parsedStartDate = new Date(existingMission.startDate);
      const deadline = new Date(
        parsedStartDate.getTime() + tf * 24 * 60 * 60 * 1000,
      );
      const gracePeriodDays = Math.ceil(tf * 0.25);
      const gracePeriodEnd = new Date(
        deadline.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000,
      );
      schedulePatch = {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        timeframe: tf,
        deadline,
        gracePeriodEnd,
      };
    }

    const updatedMission = await prisma.missions.update({
      where: {
        id: params.id,
      },
      data: {
        title,
        description,
        status,
        dailyRate,
        timeframe: schedulePatch ? schedulePatch.timeframe : timeframe,
        ...(schedulePatch
          ? {
              startDate: schedulePatch.startDate,
              endDate: schedulePatch.endDate,
              deadline: schedulePatch.deadline,
              gracePeriodEnd: schedulePatch.gracePeriodEnd,
            }
          : {}),
        categories: categoryIds
          ? {
              set: categoryIds.map((categoryId: string) => ({ categoryId })),
            }
          : undefined,
        skills: Array.isArray(skillIds)
          ? {
              set: skillIds.map((skillId: string) => ({ id: skillId })),
            }
          : undefined,
      },
      include: {
        users_missions_clientIdTousers: true,
        categories: true,
        skills: true,
        contracts: true,
      },
    });

    const {
      contracts,
      users_missions_clientIdTousers,
      ...missionRest
    } = updatedMission;

    return NextResponse.json({
      ...missionRest,
      client: users_missions_clientIdTousers,
      contract: contracts,
    });
  } catch (error) {
    console.error("Error updating mission:", error);
    return NextResponse.json(
      { error: "Failed to update mission" },
      { status: 500 }
    );
  }
}

// DELETE /api/missions/[id] - Delete a mission
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, find the mission to check if it exists and if the user owns it
    const mission = await prisma.missions.findUnique({
      where: { id: params.id },
      include: {
        users_missions_clientIdTousers: true
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Get the current user's role
    const currentUser = await prisma.users.findUnique({
      where: { clerkId: userId }
    });

    // Fetch role separately
    const role = currentUser?.roleId 
      ? await prisma.roles.findUnique({
          where: { id: currentUser.roleId }
        })
      : null;

    const isOwner = mission.clientId === currentUser?.id;
    const userRole = role?.name || 'client';
    const isAdmin = userRole === 'admin';

    // Check if the user owns this mission or is an admin
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own missions' }, { status: 403 });
    }

    await prisma.missions.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Mission deleted successfully' });
  } catch (error) {
    console.error("Error deleting mission:", error);
    return NextResponse.json(
      { error: "Failed to delete mission" },
      { status: 500 }
    );
  }
}
