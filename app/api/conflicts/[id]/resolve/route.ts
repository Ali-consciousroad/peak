import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type { SupportedCryptoCurrency } from '@/lib/crypto-transactions';

// POST /api/conflicts/[id]/resolve - Resolve conflict and handle payments automatically
// This endpoint supports both peer-to-peer resolution and admin resolution
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

    // Fetch role separately
    const role = user.roleId 
      ? await prisma.roles.findUnique({
          where: { id: user.roleId }
        })
      : null;

    const userRole = role?.name || 'client';
    const isUserAdmin = userRole === 'admin';

    let parsedBody: {
      resolutionType?: string;
      refundAmount?: number;
      releaseAmount?: number;
      reason?: string;
      mutualAgreement?: boolean;
    } = {};

    try {
      parsedBody = await request.json();
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { 
      resolutionType, // 'FULL_REFUND', 'PARTIAL_REFUND', 'FULL_RELEASE', 'PARTIAL_RELEASE', 'SPLIT'
      refundAmount, // Amount to refund to client (if applicable)
      releaseAmount, // Amount to release to freelancer (if applicable)
      reason, // Reason for resolution
      mutualAgreement = false // If true, both parties agreed (peer-to-peer)
    } = parsedBody;

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
                users_missions_clientIdTousers: true,
                payments: {
                  where: {
                    status: {
                      in: ['MADE', 'RELEASED_1', 'RELEASED_2']
                    }
                  },
                  include: {
                    currencies: true
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

    // Check permissions
    const isContractFreelancer = conflict.contracts.freelancerId === user.id;
    const isContractAdmin = conflict.contracts.adminId === user.id;
    const isMissionClient = conflict.contracts.missions?.clientId === user.id;
    const isReporter = conflict.reporterId === user.id;

    // For peer-to-peer resolution, both parties must be involved
    if (mutualAgreement && !isUserAdmin) {
      if (!isContractFreelancer && !isMissionClient) {
        return NextResponse.json(
          { error: 'Only involved parties can agree to peer-to-peer resolution' },
          { status: 403 }
        );
      }
    }

    // Only admins or involved parties can resolve
    if (!isUserAdmin && !isContractFreelancer && !isMissionClient && !isReporter) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Conflict must be in a resolvable state
    if (!['OPEN', 'IN_REVIEW'].includes(conflict.status)) {
      return NextResponse.json(
        { error: `Conflict cannot be resolved in status: ${conflict.status}` },
        { status: 400 }
      );
    }

    const mission = conflict.contracts.missions;
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Calculate total escrowed amount
    const escrowedPayments = mission.payments.filter(p => 
      ['MADE', 'RELEASED_1', 'RELEASED_2'].includes(p.status)
    );
    
    // Calculate total escrowed amount correctly
    // The original payment.amount stays the same (it's the total payment amount)
    // Milestone structure: 25% kickoff • 50% mid-project • 25% completion
    // Only the status changes to track milestone progress:
    // - MADE: 100% in escrow (nothing released yet)
    // - RELEASED_1: 75% remaining in escrow (25% released as milestone 1)
    // - RELEASED_2: 25% remaining in escrow (75% total released: 25% milestone 1 + 50% milestone 2)
    const totalEscrowed = escrowedPayments.reduce((sum, payment) => {
      if (payment.status === 'MADE') {
        // Full amount is in escrow (100%)
        return sum + Number(payment.amount);
      } else if (payment.status === 'RELEASED_1') {
        // 25% released (milestone 1), 75% still in escrow
        return sum + (Number(payment.amount) * 0.75);
      } else if (payment.status === 'RELEASED_2') {
        // 75% total released (25% milestone 1 + 50% milestone 2), 25% still in escrow
        return sum + (Number(payment.amount) * 0.25);
      }
      return sum;
    }, 0);

    // Calculate amounts based on resolution type
    let finalRefundAmount = 0;
    let finalReleaseAmount = 0;

    if (resolutionType === 'FULL_REFUND') {
      finalRefundAmount = totalEscrowed;
    } else if (resolutionType === 'PARTIAL_REFUND') {
      finalRefundAmount = refundAmount || 0;
      finalReleaseAmount = totalEscrowed - finalRefundAmount;
    } else if (resolutionType === 'FULL_RELEASE') {
      finalReleaseAmount = totalEscrowed;
    } else if (resolutionType === 'PARTIAL_RELEASE') {
      finalReleaseAmount = releaseAmount || 0;
      finalRefundAmount = totalEscrowed - finalReleaseAmount;
    } else if (resolutionType === 'SPLIT') {
      finalRefundAmount = refundAmount || 0;
      finalReleaseAmount = releaseAmount || 0;
      
      if (finalRefundAmount + finalReleaseAmount > totalEscrowed) {
        return NextResponse.json(
          { error: 'Refund + Release amount cannot exceed escrowed amount' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid resolution type' },
        { status: 400 }
      );
    }

    // Validate amounts
    if (finalRefundAmount < 0 || finalReleaseAmount < 0) {
      return NextResponse.json(
        { error: 'Amounts cannot be negative' },
        { status: 400 }
      );
    }

    if (finalRefundAmount + finalReleaseAmount > totalEscrowed) {
      return NextResponse.json(
        { error: 'Total resolution amount cannot exceed escrowed amount' },
        { status: 400 }
      );
    }

    // Update conflict status
    const updatedConflict = await prisma.conflicts.update({
      where: { id: params.id },
      data: {
        status: 'RESOLVED',
        endDate: new Date(),
        updatedAt: new Date()
      },
      include: {
        contracts: {
          include: {
            missions: true
          }
        }
      }
    });

    // Process refund if applicable
    if (finalRefundAmount > 0) {
      const clientCurrencyId = escrowedPayments[0]?.currencyId;
      
      await prisma.payments.create({
        data: {
          id: randomUUID(),
          amount: finalRefundAmount,
          paymentMethod: 'CONFLICT_REFUND',
          transactionDate: new Date(),
          missionId: mission.id,
          status: 'COMPLETED',
          userId: mission.clientId,
          currencyId: clientCurrencyId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // Process release if applicable
    if (finalReleaseAmount > 0) {
      const freelancer = conflict.contracts.users_contracts_freelancerIdTousers;
      if (freelancer) {
        const freelancerData = await prisma.users.findUnique({
          where: { id: freelancer.id },
          select: {
            preferredPaymentMethod: true,
            cryptoWalletAddress: true
          }
        });

        const currency = escrowedPayments[0]?.currencies;
        const currencyId = currency?.id || null;

        // Create release payment record
        const releasePayment = await prisma.payments.create({
          data: {
            id: randomUUID(),
            amount: finalReleaseAmount,
            paymentMethod: freelancerData?.preferredPaymentMethod || 'EUR',
            transactionDate: new Date(),
            missionId: mission.id,
            status: 'RELEASED',
            userId: freelancer.id,
            currencyId: currencyId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        // If crypto payment, process it automatically
        if (freelancerData?.preferredPaymentMethod && 
            freelancerData.preferredPaymentMethod !== 'EUR' &&
            freelancerData.cryptoWalletAddress) {
          try {
            // Import crypto transaction functions
            const { sendCryptoPayment } = await import('@/lib/crypto-transactions');
            const { convertEurToCrypto } = await import('@/lib/crypto-conversion');
            const { isPlatformWalletConfigured } = await import('@/lib/platform-wallet');

            const preferredCurrency = freelancerData.preferredPaymentMethod || null;
            let transferCurrency: SupportedCryptoCurrency | null = null;
            let conversionCurrency: string | null = null;

            if (preferredCurrency === 'AVAX') {
              transferCurrency = 'AVAX';
              conversionCurrency = 'AVAX';
            } else if (preferredCurrency === 'BTC') {
              transferCurrency = 'WBTC';
              conversionCurrency = 'BTC';
            } else if (preferredCurrency === 'ETH') {
              transferCurrency = 'WETH';
              conversionCurrency = 'ETH';
            } else {
              throw new Error(`Unsupported crypto currency: ${preferredCurrency}`);
            }

            if (!transferCurrency || !conversionCurrency) {
              throw new Error('Unsupported crypto currency configuration');
            }
            const conversion = await convertEurToCrypto(
              Number(finalReleaseAmount),
              conversionCurrency
            );

            if (isPlatformWalletConfigured()) {
              const transactionResult = await sendCryptoPayment(
                freelancerData.cryptoWalletAddress,
                conversion.cryptoAmount,
                transferCurrency
              );

              // Update payment with crypto details
              await prisma.payments.update({
                where: { id: releasePayment.id },
                data: {
                  cryptoAmount: conversion.cryptoAmount,
                  cryptoCurrency: conversionCurrency,
                  conversionRate: conversion.conversionRate,
                  cryptoWalletAddress: freelancerData.cryptoWalletAddress,
                  cryptoTransactionHash: transactionResult.transactionHash
                }
              });
            }
          } catch (error) {
            console.error('Error processing crypto payment for conflict resolution:', error);
            // Don't fail the resolution if crypto payment fails
          }
        }
      }
    }

    // Update contract status if needed
    if (resolutionType === 'FULL_REFUND') {
      await prisma.contracts.update({
        where: { id: conflict.contractId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      await prisma.missions.update({
        where: { id: mission.id },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date()
        }
      });
    }

    // Notify both client and builder about admin resolution decision.
    const currencyCode = escrowedPayments[0]?.currencies?.code || 'EUR';
    const formatAmount = (amount: number) =>
      `${Number(amount).toFixed(2)} ${currencyCode}`;
    const missionTitle = mission.title || 'mission';
    const resolutionSummary =
      `Decision: ${resolutionType}. ` +
      `Refund to client: ${formatAmount(finalRefundAmount)}. ` +
      `Release to builder: ${formatAmount(finalReleaseAmount)}.`;

    const notificationUserIds = Array.from(
      new Set<string>([mission.clientId, conflict.contracts.freelancerId]),
    );
    const now = new Date();
    await prisma.notifications.createMany({
      data: notificationUserIds.map((uid) => ({
        id: randomUUID(),
        userId: uid,
        type: 'conflict_resolved',
        conflictId: conflict.id,
        missionId: mission.id,
        title: `Conflict resolved: ${missionTitle}`,
        message: resolutionSummary,
        createdAt: now,
        updatedAt: now,
      })),
    });

    return NextResponse.json({
      success: true,
      message: 'Conflict resolved successfully',
      conflict: updatedConflict,
      resolution: {
        type: resolutionType,
        refundAmount: finalRefundAmount,
        releaseAmount: finalReleaseAmount,
        totalEscrowed,
        mutualAgreement
      }
    });

  } catch (error) {
    console.error('Error resolving conflict:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to resolve conflict', details: errorMessage },
      { status: 500 }
    );
  }
}
