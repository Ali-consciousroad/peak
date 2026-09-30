import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { convertEurToCrypto, formatCryptoAmount } from '@/lib/crypto-conversion';

/**
 * GET /api/payments/[id]/conversion-preview
 * Get a preview of the crypto conversion before releasing payment
 * Shows: EUR amount → crypto amount with current exchange rate
 */
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
      where: { clerkId: userId },
      include: { roles: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the payment
    const payment = await prisma.payments.findUnique({
      where: { id: params.id },
      include: {
        missions: {
          include: {
            contracts: {
              include: {
                users_contracts_freelancerIdTousers: true
              }
            }
          }
        },
        currencies: true
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check permissions (client or admin can preview)
    const isPaymentOwner = payment.userId === user.id;
    const isAdmin = user.roles?.name === 'admin';

    if (!isPaymentOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized to view this payment' },
        { status: 403 }
      );
    }

    // Payment must be in escrow (MADE status)
    if (payment.status !== 'MADE') {
      return NextResponse.json(
        { error: 'Payment must be verified (in escrow) to preview conversion' },
        { status: 400 }
      );
    }

    // Get freelancer's payment preference
    const freelancer = payment.missions.contracts?.users_contracts_freelancerIdTousers;
    if (!freelancer) {
      return NextResponse.json(
        { error: 'No freelancer assigned to this mission' },
        { status: 400 }
      );
    }

    const freelancerData = await prisma.users.findUnique({
      where: { id: freelancer.id },
      select: {
        preferredPaymentMethod: true,
        cryptoWalletAddress: true,
        firstName: true,
        lastName: true
      }
    });

    if (!freelancerData) {
      return NextResponse.json(
        { error: 'Freelancer data not found' },
        { status: 404 }
      );
    }

    // If freelancer prefers EUR, no conversion needed
    if (!freelancerData.preferredPaymentMethod || 
        freelancerData.preferredPaymentMethod === 'EUR' ||
        !freelancerData.cryptoWalletAddress) {
      return NextResponse.json({
        paymentId: payment.id,
        eurAmount: Number(payment.amount),
        conversion: null,
        message: 'Freelancer prefers EUR payment. No conversion needed.'
      });
    }

    // Get current conversion rate
    try {
      const conversion = await convertEurToCrypto(
        Number(payment.amount),
        freelancerData.preferredPaymentMethod
      );

      return NextResponse.json({
        paymentId: payment.id,
        eurAmount: Number(payment.amount),
        freelancer: {
          name: `${freelancerData.firstName || ''} ${freelancerData.lastName || ''}`.trim() || 'Builder',
          preferredPaymentMethod: freelancerData.preferredPaymentMethod,
          walletAddress: freelancerData.cryptoWalletAddress
        },
        conversion: {
          cryptoAmount: conversion.cryptoAmount,
          cryptoCurrency: conversion.cryptoCurrency,
          conversionRate: conversion.conversionRate,
          formattedAmount: formatCryptoAmount(conversion.cryptoAmount, conversion.cryptoCurrency),
          rateTimestamp: conversion.timestamp,
          // Show rate as: 1 EUR = X crypto
          rateDisplay: `1 EUR = ${conversion.conversionRate.toFixed(8)} ${conversion.cryptoCurrency}`
        },
        note: 'This is a preview. Actual rate may vary slightly when payment is released.'
      });
    } catch (error) {
      console.error('Error getting conversion preview:', error);
      return NextResponse.json(
        { 
          error: 'Failed to get conversion preview',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in conversion preview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




