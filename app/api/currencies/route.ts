import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/currencies - Get all available currencies
export async function GET() {
  try {
    const currencies = await prisma.currencies.findMany({
      orderBy: { code: 'asc' }
    });
    
    return NextResponse.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currencies' },
      { status: 500 }
    );
  }
}
