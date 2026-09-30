/**
 * Crypto Transaction Service
 * 
 * Handles sending crypto payments to builders on Avalanche C-Chain.
 * Supports:
 * - AVAX (native token)
 * - WBTC.e (Wrapped BTC on Avalanche)
 * - WETH.e (Wrapped ETH on Avalanche)
 */

import { 
  platformWallet, 
  publicClient, 
  isPlatformWalletConfigured 
} from './platform-wallet';
import { parseEther, parseUnits, formatEther, type Address } from 'viem';
import { waitForTransactionReceipt } from 'viem';

// ERC-20 ABI (minimal - only functions we need)
const erc20Abi = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
] as const;

// ERC-20 Token Contracts on Avalanche C-Chain
const TOKEN_CONTRACTS = {
  WBTC: '0x50b7545627a5162F82A992c33b87aDc75187B218' as Address, // WBTC.e
  WETH: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB' as Address, // WETH.e
} as const;

// Token decimals
const TOKEN_DECIMALS = {
  AVAX: 18,
  WBTC: 8,  // WBTC uses 8 decimals
  WETH: 18,
} as const;

export type SupportedCryptoCurrency = 'AVAX' | 'WBTC' | 'WETH';

export interface TransactionResult {
  transactionHash: string;
  currency: SupportedCryptoCurrency;
  amount: string;
  toAddress: string;
  confirmed: boolean;
  blockNumber?: bigint;
  gasUsed?: bigint;
}

export interface TransactionError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Send AVAX (native token) to a builder
 */
async function sendAvax(
  toAddress: Address,
  amount: number
): Promise<TransactionResult> {
  if (!platformWallet) {
    throw new Error('Platform wallet not configured');
  }

  // Parse amount to wei (AVAX uses 18 decimals)
  const amountWei = parseEther(amount.toString());

  // Check platform balance
  const balance = await publicClient.getBalance({
    address: platformWallet.account.address,
  });

  // Estimate gas (simple transfer uses ~21,000 gas)
  // Add 20% buffer for safety
  const gasEstimate = 21000n;
  const gasPrice = await publicClient.getGasPrice();
  const gasCost = gasEstimate * gasPrice;

  if (balance < amountWei + gasCost) {
    throw new Error(
      `Insufficient balance. Need ${formatEther(amountWei + gasCost)} AVAX, ` +
      `have ${formatEther(balance)} AVAX`
    );
  }

  // Send transaction
  const hash = await platformWallet.sendTransaction({
    to: toAddress,
    value: amountWei,
  });

  // Wait for confirmation (1 block confirmation)
  const receipt = await waitForTransactionReceipt(publicClient, {
    hash,
    confirmations: 1,
  });

  return {
    transactionHash: hash,
    currency: 'AVAX',
    amount: amount.toString(),
    toAddress,
    confirmed: receipt.status === 'success',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}

/**
 * Send ERC-20 token (WBTC.e or WETH.e) to a builder
 */
async function sendERC20Token(
  toAddress: Address,
  amount: number,
  currency: 'WBTC' | 'WETH'
): Promise<TransactionResult> {
  if (!platformWallet) {
    throw new Error('Platform wallet not configured');
  }

  const tokenContract = TOKEN_CONTRACTS[currency];
  const decimals = TOKEN_DECIMALS[currency];

  // Parse amount with correct decimals
  const amountParsed = parseUnits(amount.toString(), decimals);

  // Check token balance
  const balance = await publicClient.readContract({
    address: tokenContract,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [platformWallet.account.address],
  });

  if (balance < amountParsed) {
    const balanceFormatted = formatEther(balance * BigInt(10 ** (18 - decimals)));
    throw new Error(
      `Insufficient ${currency} balance. Need ${amount} ${currency}, ` +
      `have ${balanceFormatted} ${currency}`
    );
  }

  // Check AVAX balance for gas
  const avaxBalance = await publicClient.getBalance({
    address: platformWallet.account.address,
  });
  const minGasRequired = parseEther('0.001'); // ~$0.01 worth of AVAX
  if (avaxBalance < minGasRequired) {
    throw new Error(
      `Insufficient AVAX for gas. Need at least ${formatEther(minGasRequired)} AVAX`
    );
  }

  // Send ERC-20 transfer transaction
  const hash = await platformWallet.writeContract({
    address: tokenContract,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [toAddress, amountParsed],
  });

  // Wait for confirmation
  const receipt = await waitForTransactionReceipt(publicClient, {
    hash,
    confirmations: 1,
  });

  return {
    transactionHash: hash,
    currency,
    amount: amount.toString(),
    toAddress,
    confirmed: receipt.status === 'success',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}

/**
 * Send crypto payment to a builder
 * 
 * @param toAddress - Builder's wallet address
 * @param amount - Amount to send (in crypto, not EUR)
 * @param currency - Currency to send (AVAX, WBTC, or WETH)
 * @returns Transaction result with hash and confirmation status
 */
export async function sendCryptoPayment(
  toAddress: string,
  amount: number,
  currency: SupportedCryptoCurrency
): Promise<TransactionResult> {
  // Validate wallet is configured
  if (!isPlatformWalletConfigured()) {
    throw new Error(
      'Platform wallet not configured. Set PLATFORM_WALLET_PRIVATE_KEY in environment variables.'
    );
  }

  // Validate address format
  if (!toAddress || !toAddress.startsWith('0x') || toAddress.length !== 42) {
    throw new Error(`Invalid wallet address: ${toAddress}`);
  }

  // Validate amount
  if (amount <= 0) {
    throw new Error(`Invalid amount: ${amount}. Must be greater than 0.`);
  }

  const address = toAddress as Address;

  try {
    // Send based on currency type
    if (currency === 'AVAX') {
      return await sendAvax(address, amount);
    } else if (currency === 'WBTC' || currency === 'WETH') {
      return await sendERC20Token(address, amount, currency);
    } else {
      throw new Error(`Unsupported currency: ${currency}`);
    }
  } catch (error: any) {
    // Enhance error messages
    if (error.message) {
      throw error;
    }
    throw new Error(`Failed to send ${currency} payment: ${error.toString()}`);
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  transactionHash: string
): Promise<{
  status: 'pending' | 'success' | 'failed';
  blockNumber?: bigint;
  confirmations?: number;
}> {
  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    if (!receipt) {
      return { status: 'pending' };
    }

    return {
      status: receipt.status === 'success' ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      confirmations: receipt.status === 'success' ? 1 : 0,
    };
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return { status: 'pending' };
  }
}

/**
 * Check if platform has sufficient balance for a payment
 */
export async function checkPlatformBalance(
  amount: number,
  currency: SupportedCryptoCurrency
): Promise<{
  sufficient: boolean;
  balance: string;
  required: string;
  message: string;
}> {
  if (!isPlatformWalletConfigured()) {
    return {
      sufficient: false,
      balance: '0',
      required: amount.toString(),
      message: 'Platform wallet not configured',
    };
  }

  try {
    if (currency === 'AVAX') {
      const balance = await publicClient.getBalance({
        address: platformWallet!.account.address,
      });
      const balanceAvax = Number(balance) / 1e18;
      const required = amount + 0.001; // Add gas buffer

      return {
        sufficient: balanceAvax >= required,
        balance: balanceAvax.toFixed(8),
        required: required.toFixed(8),
        message: balanceAvax >= required
          ? 'Sufficient balance'
          : `Insufficient AVAX. Need ${required.toFixed(8)}, have ${balanceAvax.toFixed(8)}`,
      };
    } else {
      // For ERC-20 tokens
      const tokenContract = TOKEN_CONTRACTS[currency];
      const decimals = TOKEN_DECIMALS[currency];
      const amountParsed = parseUnits(amount.toString(), decimals);

      const balance = await publicClient.readContract({
        address: tokenContract,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [platformWallet!.account.address],
      });

      const balanceFormatted = Number(balance) / 10 ** decimals;

      return {
        sufficient: balance >= amountParsed,
        balance: balanceFormatted.toFixed(decimals === 8 ? 8 : 18),
        required: amount.toFixed(decimals === 8 ? 8 : 18),
        message: balance >= amountParsed
          ? 'Sufficient balance'
          : `Insufficient ${currency}. Need ${amount}, have ${balanceFormatted}`,
      };
    }
  } catch (error: any) {
    return {
      sufficient: false,
      balance: '0',
      required: amount.toString(),
      message: `Error checking balance: ${error.message}`,
    };
  }
}

