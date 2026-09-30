import { NextResponse } from 'next/server';
import { convertEurToCrypto, getCryptoRate, getSupportedCryptocurrencies } from '@/lib/crypto-conversion';

// GET /api/crypto/convert - Get crypto conversion rates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eurAmount = parseFloat(searchParams.get('amount') || '0');
    const cryptoCurrency = searchParams.get('currency') || 'BTC';

    if (eurAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const conversion = await convertEurToCrypto(eurAmount, cryptoCurrency);
    
    return NextResponse.json(conversion);
  } catch (error) {
    console.error('Error converting currency:', error);
    return NextResponse.json(
      { error: 'Failed to convert currency' },
      { status: 500 }
    );
  }
}

// GET /api/crypto/rates - Get current crypto rates
export async function POST(request: Request) {
  try {
    const { currency } = await request.json();
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Currency is required' },
        { status: 400 }
      );
    }

    const rate = await getCryptoRate(currency);
    
    return NextResponse.json(rate);
  } catch (error) {
    console.error('Error fetching crypto rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crypto rate' },
      { status: 500 }
    );
  }
}
