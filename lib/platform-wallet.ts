/**
 * Platform Wallet Service
 * 
 * This service manages the platform's wallet for sending crypto payments to builders.
 * Uses viem to interact with Avalanche C-Chain.
 * 
 * Security:
 * - Private key stored in environment variable (PLATFORM_WALLET_PRIVATE_KEY)
 * - Never commit private key to git
 * - Consider using hardware wallet or multi-sig for production
 */

import { createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalanche } from 'viem/chains';
import { createPublicClient } from 'viem';

// Get RPC URL from environment or use default Avalanche public RPC
const AVALANCHE_RPC_URL = 
  process.env.AVALANCHE_RPC_URL || 
  'https://api.avax.network/ext/bc/C/rpc';

// Validate that private key is set
if (!process.env.PLATFORM_WALLET_PRIVATE_KEY) {
  console.warn(
    '⚠️  PLATFORM_WALLET_PRIVATE_KEY not set. Crypto payments will not work.\n' +
    'Set this in your .env file to enable real crypto transactions.'
  );
}

// Create platform wallet account
let platformAccount: ReturnType<typeof privateKeyToAccount> | null = null;
if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
  try {
    platformAccount = privateKeyToAccount(
      process.env.PLATFORM_WALLET_PRIVATE_KEY as `0x${string}`
    );
  } catch (error) {
    console.error('❌ Failed to create platform wallet account:', error);
    console.error('Make sure PLATFORM_WALLET_PRIVATE_KEY is a valid hex private key (0x...)');
  }
}

// Create wallet client for sending transactions
export const platformWallet = platformAccount
  ? createWalletClient({
      account: platformAccount,
      chain: avalanche,
      transport: http(AVALANCHE_RPC_URL),
    })
  : null;

// Create public client for reading blockchain state
export const publicClient = createPublicClient({
  chain: avalanche,
  transport: http(AVALANCHE_RPC_URL),
});

/**
 * Get the platform wallet address
 */
export async function getPlatformWalletAddress(): Promise<Address | null> {
  if (!platformAccount) {
    return null;
  }
  return platformAccount.address;
}

/**
 * Get the platform wallet balance (in AVAX)
 */
export async function getPlatformBalance(): Promise<bigint> {
  if (!platformAccount) {
    return 0n;
  }
  
  try {
    const balance = await publicClient.getBalance({
      address: platformAccount.address,
    });
    return balance;
  } catch (error) {
    console.error('Error getting platform balance:', error);
    return 0n;
  }
}

/**
 * Check if platform wallet is configured
 */
export function isPlatformWalletConfigured(): boolean {
  return platformWallet !== null && platformAccount !== null;
}

/**
 * Get platform wallet info (for debugging/admin)
 */
export async function getPlatformWalletInfo() {
  if (!platformAccount) {
    return {
      configured: false,
      address: null,
      balance: '0 AVAX',
    };
  }

  const address = platformAccount.address;
  const balance = await getPlatformBalance();
  const balanceInAvax = Number(balance) / 1e18;

  return {
    configured: true,
    address,
    balance: `${balanceInAvax.toFixed(4)} AVAX`,
    balanceWei: balance.toString(),
  };
}

