import { NextResponse } from 'next/server';
import { getSupportedCryptocurrencies } from '@/lib/crypto-conversion';

// GET /api/crypto/currencies - Get supported cryptocurrencies
export async function GET() {
  try {
    const currencies = getSupportedCryptocurrencies();
    
    return NextResponse.json({
      currencies,
      count: currencies.length
    });
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supported currencies' },
      { status: 500 }
    );
  }
}
