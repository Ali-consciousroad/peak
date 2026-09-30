import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { convertEurToCrypto, formatCryptoAmount } from '@/lib/crypto-conversion';
import { sendCryptoPayment, checkPlatformBalance } from '@/lib/crypto-transactions';
import { isPlatformWalletConfigured } from '@/lib/platform-wallet';
import { notifyAdminsPayoutActionRequired } from '@/lib/payout-notifications';
import { randomUUID } from 'crypto';

// POST /api/payments/[id]/release-milestone - Release a milestone payment
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Only clients can release milestone payments
    const userRole = role?.name || 'client';
    if (userRole !== 'client') {
      return NextResponse.json({ error: 'Only clients can release milestone payments' }, { status: 403 });
    }

    const { milestone } = await request.json();

    // Validate milestone (1, 2, or 3)
    if (![1, 2, 3].includes(milestone)) {
      return NextResponse.json({ error: 'Invalid milestone. Must be 1, 2, or 3.' }, { status: 400 });
    }

    // Find the original payment
    const originalPayment = await prisma.payments.findUnique({
      where: { id: params.id },
      include: {
        missions: {
          include: {
            users_missions_clientIdTousers: true,
            contracts: {
              include: {
                users_contracts_freelancerIdTousers: true
              }
            }
          }
        },
        currencies: true,
        users: true
      }
    });

    if (!originalPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check if user is the client for this mission
    if (originalPayment.missions?.clientId !== user.id) {
      return NextResponse.json({ error: 'Access denied. You are not the client for this mission.' }, { status: 403 });
    }

    // Payment must be in appropriate status for milestone release
    const validStatuses = ['MADE', 'RELEASED_1', 'RELEASED_2'];
    if (!validStatuses.includes(originalPayment.status)) {
      return NextResponse.json({ 
        error: `Payment must be in escrow to release milestones. Current status: ${originalPayment.status}` 
      }, { status: 400 });
    }

    // Check if the milestone can be released based on current status
    if (originalPayment.status === 'MADE' && milestone !== 1) {
      return NextResponse.json({ 
        error: 'Must release milestone 1 first' 
      }, { status: 400 });
    }
    if (originalPayment.status === 'RELEASED_1' && milestone !== 2) {
      return NextResponse.json({ 
        error: 'Must release milestone 2 next' 
      }, { status: 400 });
    }
    if (originalPayment.status === 'RELEASED_2' && milestone !== 3) {
      return NextResponse.json({ 
        error: 'Must release milestone 3 next' 
      }, { status: 400 });
    }

    // Calculate milestone amount
    const totalAmount = Number(originalPayment.amount);
    const milestoneAmounts = {
      1: totalAmount * 0.25, // 25%
      2: totalAmount * 0.50, // 50%
      3: totalAmount * 0.25  // 25%
    };

    const milestoneAmount = milestoneAmounts[milestone as keyof typeof milestoneAmounts];

    // Get freelancer's payment preference
    const freelancer = originalPayment.missions?.contracts?.users_contracts_freelancerIdTousers;
    if (!freelancer) {
      return NextResponse.json({ error: 'No freelancer assigned to this mission' }, { status: 400 });
    }

    const freelancerData = await prisma.users.findUnique({
      where: { id: freelancer.id },
      select: {
        preferredPaymentMethod: true,
        cryptoWalletAddress: true
      }
    });

    // Handle crypto conversion if needed
    let cryptoData = null;
    let cryptoTransactionHash = null;

    if (freelancerData?.preferredPaymentMethod &&
        freelancerData.preferredPaymentMethod !== 'EUR' &&
        freelancerData.cryptoWalletAddress) {
      try {
        const conversion = await convertEurToCrypto(
          milestoneAmount,
          freelancerData.preferredPaymentMethod
        );

        // Map currencies to Avalanche C-Chain equivalents
        // BTC -> WBTC, ETH -> WETH, AVAX stays as AVAX
        // SOL requires Solana blockchain integration (separate implementation needed)
        if (conversion.cryptoCurrency === 'SOL') {
          throw new Error(
            'SOL payments require Solana blockchain integration. ' +
            'Please use AVAX, BTC, or ETH for now, or contact support for SOL payment setup.'
          );
        }
        
        const currencyMap: Record<string, 'AVAX' | 'WBTC' | 'WETH'> = {
          'BTC': 'WBTC',
          'ETH': 'WETH',
          'AVAX': 'AVAX',
        };
        
        const avalancheCurrency = currencyMap[conversion.cryptoCurrency] || 'AVAX';

        cryptoData = {
          cryptoAmount: conversion.cryptoAmount,
          cryptoCurrency: conversion.cryptoCurrency,
          conversionRate: conversion.conversionRate
        };

        // Execute real crypto transaction
        if (isPlatformWalletConfigured()) {
          // Check platform balance
          const balanceCheck = await checkPlatformBalance(
            conversion.cryptoAmount,
            avalancheCurrency
          );
          
          if (!balanceCheck.sufficient) {
            throw new Error(
              `Insufficient platform balance: ${balanceCheck.message}. ` +
              `Please top up the platform wallet.`
            );
          }

          // Send crypto payment
          const transactionResult = await sendCryptoPayment(
            freelancerData.cryptoWalletAddress,
            conversion.cryptoAmount,
            avalancheCurrency
          );
          
          cryptoTransactionHash = transactionResult.transactionHash;
          
          console.log(`[CRYPTO PAYMENT] ✅ Milestone ${milestone}: Sent ${formatCryptoAmount(conversion.cryptoAmount, conversion.cryptoCurrency)} to ${freelancerData.cryptoWalletAddress}`);
          console.log(`[CRYPTO PAYMENT] Transaction hash: ${cryptoTransactionHash}`);
        } else {
          // Platform wallet not configured
          console.warn('⚠️  Platform wallet not configured. Crypto payment simulated.');
          cryptoTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
          console.log(`[CRYPTO PAYMENT] ⚠️  SIMULATED: Milestone ${milestone}: ${formatCryptoAmount(conversion.cryptoAmount, conversion.cryptoCurrency)}`);
        }
      } catch (error: any) {
        console.error('Error processing crypto payment:', error);
        return NextResponse.json(
          { 
            error: 'Failed to process crypto payment',
            details: error.message || 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // Create milestone payment record
    const milestonePayment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        amount: milestoneAmount,
        paymentMethod: originalPayment.paymentMethod,
        status: 'RELEASED',
        transactionDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        missionId: originalPayment.missionId,
        userId: user.id,
        currencyId: originalPayment.currencyId,
        ...(cryptoData && {
          cryptoAmount: cryptoData.cryptoAmount,
          cryptoCurrency: cryptoData.cryptoCurrency,
          conversionRate: cryptoData.conversionRate,
          cryptoWalletAddress: freelancerData?.cryptoWalletAddress,
          cryptoTransactionHash
        })
      },
      include: {
        missions: true,
        currencies: true,
        users: true
      }
    });

    // Update the original payment status to track milestone progress
    let newStatus = '';
    if (milestone === 1) {
      newStatus = 'RELEASED_1';
    } else if (milestone === 2) {
      newStatus = 'RELEASED_2';
      } else if (milestone === 3) {
        newStatus = 'COMPLETED';
        // Automatically complete the mission when final milestone is released
        await prisma.missions.update({
          where: { id: originalPayment.missionId },
          data: { 
            status: 'COMPLETED',
            updatedAt: new Date()
          }
        });
        
        // Also mark the contract as inactive when mission is completed
        await prisma.contracts.updateMany({
          where: { missionId: originalPayment.missionId },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        });
      }

    // Update the original payment status
    await prisma.payments.update({
      where: { id: originalPayment.id },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      }
    });

    const missionTitleForAdmin = originalPayment.missions?.title || 'Unknown mission';
    await notifyAdminsPayoutActionRequired({
      missionId: originalPayment.missionId || null,
      title: `Milestone ${milestone} ready for payout`,
      intro: `Client released €${milestoneAmount.toFixed(2)} for mission "${missionTitleForAdmin}". Transfer payout to the builder and mark it as completed.`,
      freelancerId: freelancer.id
    });

    const missionTitle = originalPayment.missions?.title || 'Unknown mission';
    const milestonePct = (milestoneAmount * 100) / totalAmount;
    try {
      await prisma.notifications.create({
        data: {
          id: randomUUID(),
          userId: freelancer.id,
          type: 'milestone_released',
          missionId: originalPayment.missionId || null,
          title: `Milestone ${milestone} released`,
          message: `The client released €${milestoneAmount.toFixed(2)} (${milestonePct.toFixed(0)}% of the project) for "${missionTitle}".`,
          updatedAt: new Date()
        }
      });
    } catch (freelancerNotifError) {
      console.error('Failed to create freelancer milestone notification:', freelancerNotifError);
    }

    return NextResponse.json({
      payment: milestonePayment,
      message: `Milestone ${milestone} (${(milestoneAmount * 100 / totalAmount).toFixed(0)}%) released successfully!`,
      isFinalMilestone: milestone === 3
    });

  } catch (error) {
    console.error('Error releasing milestone payment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
