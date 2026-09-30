import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { convertEurToCrypto, formatCryptoAmount } from '@/lib/crypto-conversion';
import { sendCryptoPayment, checkPlatformBalance } from '@/lib/crypto-transactions';
import { isPlatformWalletConfigured } from '@/lib/platform-wallet';
import { notifyAdminsPayoutActionRequired } from '@/lib/payout-notifications';
import { randomUUID } from 'crypto';

// POST /api/payments/[id]/release - Release payment to freelancer (mission completed)
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

    // Find the payment
    const payment = await prisma.payments.findUnique({
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

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check permissions
    const isPaymentOwner = payment.userId === user.id;
    const isAdmin = userRole === 'admin';

    if (!isPaymentOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only release your own payments' },
        { status: 403 }
      );
    }

    // Check if payment is in correct status (must be MADE - in escrow)
    if (payment.status !== 'MADE') {
      return NextResponse.json(
        { error: `Payment must be verified (in escrow) before release. Current status: ${payment.status}` },
        { status: 400 }
      );
    }

    // Check if mission has a contract
    if (!payment.missions?.contracts) {
      return NextResponse.json(
        { error: 'Mission must have a contract before payment can be released' },
        { status: 400 }
      );
    }

    // Get freelancer's payment preference
    const freelancer = payment.missions.contracts.users_contracts_freelancerIdTousers;
    if (!freelancer) {
      return NextResponse.json(
        { error: 'Contract freelancer not found' },
        { status: 404 }
      );
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
          cryptoCurrency: conversion.cryptoCurrency, // Keep original for display
          conversionRate: conversion.conversionRate
        };

        // Execute real crypto transaction
        if (isPlatformWalletConfigured()) {
          // Check platform balance before sending
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
          console.log(`[CRYPTO PAYMENT] Conversion rate: ${conversion.conversionRate} (1 EUR = ${conversion.conversionRate.toFixed(8)} ${conversion.cryptoCurrency})`);
          console.log(`[CRYPTO PAYMENT] Transaction hash: ${cryptoTransactionHash}`);
          console.log(`[CRYPTO PAYMENT] Block: ${transactionResult.blockNumber}, Gas used: ${transactionResult.gasUsed}`);
        } else {
          // Platform wallet not configured - log warning but don't fail
          console.warn(
            '⚠️  Platform wallet not configured. Crypto payment simulated. ' +
            'Set PLATFORM_WALLET_PRIVATE_KEY in environment variables to enable real transactions.'
          );
          // Generate simulated hash for development
          cryptoTransactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
          console.log(`[CRYPTO PAYMENT] ⚠️  SIMULATED: ${formatCryptoAmount(conversion.cryptoAmount, conversion.cryptoCurrency)} to ${freelancerData.cryptoWalletAddress}`);
        }
      } catch (error: any) {
        console.error('Error processing crypto payment:', error);
        // Return error instead of silently falling back
        // This ensures the client knows the payment failed
        return NextResponse.json(
          { 
            error: 'Failed to process crypto payment',
            details: error.message || 'Unknown error',
            suggestion: 'Payment will be processed in EUR if crypto payment fails. Please contact support if this persists.'
          },
          { status: 500 }
        );
      }
    }

    // Update payment status to released
    const updatedPayment = await prisma.payments.update({
      where: { id: params.id },
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
    await prisma.missions.update({
      where: { id: payment.missionId },
      data: { 
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });

    // Update contract status to completed
    await prisma.contracts.update({
      where: { id: payment.missions.contracts.id },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });

    const missionTitle = payment.missions?.title || 'Unknown mission';
    const amountText = Number(payment.amount).toFixed(2);

    await notifyAdminsPayoutActionRequired({
      missionId: payment.missionId || null,
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
          missionId: payment.missionId || null,
          title: 'Payment released',
          message: `The client released €${amountText} for "${missionTitle}".`,
          updatedAt: new Date()
        }
      });
    } catch (freelancerNotifError) {
      console.error('Failed to create freelancer payment release notification:', freelancerNotifError);
    }

    return NextResponse.json({
      message: 'Payment released successfully',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Error releasing payment:', error);
    return NextResponse.json(
      { error: 'Failed to release payment' },
      { status: 500 }
    );
  }
}
