// Crypto conversion service
// This would typically integrate with a real crypto exchange API like CoinGecko, CoinMarketCap, or Binance

export interface CryptoRate {
  currency: string;
  rate: number; // EUR to crypto rate
  timestamp: number;
}

export interface CryptoConversion {
  eurAmount: number;
  cryptoAmount: number;
  cryptoCurrency: string;
  conversionRate: number;
  timestamp: number;
}

// Mock crypto rates (in production, this would fetch from a real API)
const MOCK_CRYPTO_RATES: Record<string, number> = {
  BTC: 0.000023, // 1 EUR = 0.000023 BTC (approx 43,000 EUR per BTC)
  ETH: 0.0004,   // 1 EUR = 0.0004 ETH (approx 2,500 EUR per ETH)
  AVAX: 0.025,   // 1 EUR = 0.025 AVAX (approx 40 EUR per AVAX)
  SOL: 0.05,     // 1 EUR = 0.05 SOL (approx 20 EUR per SOL)
};

export async function getCryptoRate(cryptoCurrency: string): Promise<CryptoRate> {
  // In production, this would make an API call to a crypto exchange
  // For now, we'll use mock data with some realistic variation
  
  const baseRate = MOCK_CRYPTO_RATES[cryptoCurrency.toUpperCase()];
  if (!baseRate) {
    throw new Error(`Unsupported cryptocurrency: ${cryptoCurrency}`);
  }

  // Add some realistic variation (±2%)
  const variation = (Math.random() - 0.5) * 0.04;
  const rate = baseRate * (1 + variation);

  return {
    currency: cryptoCurrency.toUpperCase(),
    rate,
    timestamp: Date.now()
  };
}

export async function convertEurToCrypto(
  eurAmount: number, 
  cryptoCurrency: string
): Promise<CryptoConversion> {
  const rate = await getCryptoRate(cryptoCurrency);
  
  return {
    eurAmount,
    cryptoAmount: eurAmount * rate.rate,
    cryptoCurrency: rate.currency,
    conversionRate: rate.rate,
    timestamp: rate.timestamp
  };
}

export async function convertCryptoToEur(
  cryptoAmount: number,
  cryptoCurrency: string
): Promise<number> {
  const rate = await getCryptoRate(cryptoCurrency);
  return cryptoAmount / rate.rate;
}

export function formatCryptoAmount(amount: number, currency: string): string {
  const decimals = currency === 'BTC' ? 8 : currency === 'ETH' ? 6 : currency === 'AVAX' ? 6 : currency === 'SOL' ? 6 : 2;
  return `${amount.toFixed(decimals)} ${currency}`;
}

export function getSupportedCryptocurrencies(): string[] {
  return Object.keys(MOCK_CRYPTO_RATES);
}

// Validate crypto wallet address format (basic validation)
export function validateCryptoWalletAddress(address: string, currency: string): boolean {
  if (!address || address.length < 10) return false;
  
  switch (currency.toUpperCase()) {
    case 'BTC':
      // Bitcoin addresses start with 1, 3, or bc1
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || 
             /^bc1[a-z0-9]{39,59}$/.test(address);
    case 'ETH':
      // Ethereum addresses are 42 characters starting with 0x
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'AVAX':
      // Avalanche C-Chain uses Ethereum-style addresses (0x...)
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'SOL':
      // Solana addresses are base58 encoded, typically 32-44 characters
      // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    default:
      return false;
  }
}
