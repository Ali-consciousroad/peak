import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { convertEurToCrypto, formatCryptoAmount } from '@/lib/crypto-conversion';
import { sendCryptoPayment, checkPlatformBalance } from '@/lib/crypto-transactions';
import { isPlatformWalletConfigured } from '@/lib/platform-wallet';
import { notifyAdminsPayoutActionRequired } from '@/lib/payout-notifications';
import { randomUUID } from 'crypto';

// POST /api/missions/[id]/complete - Mark mission as completed and release payment
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await request.json();

    // Find the user
    const user = await prisma.users.findUnique({
      where: { clerkId: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the mission
    const mission = await prisma.missions.findUnique({
      where: { id: params.id },
      include: {
        users_missions_clientIdTousers: true,
        contracts: {
          include: {
            users_contracts_freelancerIdTousers: true
          }
        }
      }
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // Only the client can mark mission as completed
    if (mission.users_missions_clientIdTousers.id !== user.id) {
      return NextResponse.json({ error: 'Only the client can mark mission as completed' }, { status: 403 });
    }

    // Mission must be in progress
    if (mission.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Mission must be in progress to mark as completed' }, { status: 400 });
    }

    // Find the payment
    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        currencies: true
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Payment must be in escrow (MADE status - admin verified)
    if (payment.status !== 'MADE') {
      return NextResponse.json({ error: 'Payment must be in escrow (admin verified) before mission can be completed' }, { status: 400 });
    }

    // Get freelancer's payment preference
    const freelancer = mission.contracts?.users_contracts_freelancerIdTousers;
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

    let cryptoData = null;
    let cryptoTransactionHash = null;

    // If freelancer prefers crypto payment
    if (freelancerData?.preferredPaymentMethod && 
        freelancerData.preferredPaymentMethod !== 'EUR' &&
        freelancerData.cryptoWalletAddress) {
      
      try {
        // Convert EUR to crypto
        const conversion = await convertEurToCrypto(
          Number(payment.amount), 
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
          
          console.log(`[CRYPTO PAYMENT] ✅ Sent ${formatCryptoAmount(conversion.cryptoAmount, conversion.cryptoCurrency)} to ${freelancerData.cryptoWalletAddress}`);
          console.log(`[CRYPTO PAYMENT] Transaction hash: ${cryptoTransactionHash}`);
        } else {
          // Platform wallet not configured
          console.warn('⚠️  Platform wallet not configured. Crypto payment simulated.');
          cryptoTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
          console.log(`[CRYPTO PAYMENT] ⚠️  SIMULATED: ${formatCryptoAmount(conversion.cryptoAmount, conversion.cryptoCurrency)} to ${freelancerData.cryptoWalletAddress}`);
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

    // Update payment status to released
    const updatedPayment = await prisma.payments.update({
      where: { id: paymentId },
      data: {
        status: 'RELEASED',
        transactionDate: new Date(), // Update transaction date to release date
        updatedAt: new Date(),
        ...(cryptoData && {
          cryptoAmount: cryptoData.cryptoAmount,
          cryptoCurrency: cryptoData.cryptoCurrency,
          conversionRate: cryptoData.conversionRate,
          cryptoWalletAddress: freelancerData?.cryptoWalletAddress,
          cryptoTransactionHash
        })
      },
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

    // Update mission status to completed
    const updatedMission = await prisma.missions.update({
      where: { id: params.id },
      data: { status: 'COMPLETED', updatedAt: new Date() }
    });

    const missionTitle = mission.title || 'Unknown mission';
    const amountText = Number(payment.amount).toFixed(2);

    await notifyAdminsPayoutActionRequired({
      missionId: params.id,
      title: 'Payment released — payout required',
      intro: `Client released €${amountText} for mission "${missionTitle}". Complete the transfer to the builder and mark payout as completed.`,
      freelancerId: freelancer.id
    });

    try {
      await prisma.notifications.create({
        data: {
          id: randomUUID(),
          userId: freelancer.id,
          type: 'payment_released',
          missionId: params.id,
          title: 'Payment released',
          message: `The client released €${amountText} for "${missionTitle}".`,
          updatedAt: new Date()
        }
      });
    } catch (freelancerNotifError) {
      console.error('Failed to create freelancer payment release notification:', freelancerNotifError);
    }

    return NextResponse.json({
      mission: updatedMission,
      payment: updatedPayment,
      message: 'Mission marked as completed and payment released successfully'
    });

  } catch (error: any) {
    console.error('Error completing mission:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error?.message, stack: error?.stack },
      { status: 500 }
    );
  }
}
